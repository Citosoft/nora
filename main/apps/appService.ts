import { APP_SAMPLE_MAX_BYTES, APP_SOURCE_PAGED_ROW_LIMIT } from "@shared/apps/contracts";
import { DEFAULT_APP_ICON } from "@shared/apps/icons";
import { moveAppPanel } from "@shared/apps/panelLayout";
import type { AppIcon, AppActionResult, AppDefinition, AppRenderData, AppSource, AppSourceState, AppSpec, AppSpecInput } from "@shared/types/apps/apps.types";
import type { Connector, ConnectorSubject } from "@shared/types/connectors/connectors.types";
import type { JsonValue } from "@main/jsonValue";
import type { AppService, AppServiceOptions } from "@main/types/apps/apps.types";
import type { ConnectorToolCallResult } from "@main/types/connectors/connectors.types";
import { ConnectorToolError } from "@main/connectors/toolError";
import { compileSelect, selectRows, toolResultInput } from "./selectRows";
import { resolveSourceArgs, sourceHasBoundArgs } from "./sourceArgs";
import { compileAlert } from "./alerts";
import { describeIssues, validateAppSpec } from "./validateAppSpec";
import { describeActionOutcome } from "./actionOutcome";

const RESULT_MESSAGE_CHARS = 500;
/** Samples taken before create_app names the app are keyed by the builder thread. */
const pendingKey = (threadId: string): string => `thread:${threadId}`;

/** Per app: shaped rows and state per source, and the window's latest inputs for bound arguments, reused by later reloads. */
/** Where a paged source stands: rows loaded so far (the next offset) and the cursor the last page handed back. */
interface SourcePaging { count: number; cursor: JsonValue | null; }
interface AppData { sources: Record<string, JsonValue>; states: Record<string, AppSourceState>; inputs: Record<string, Record<string, JsonValue>>; paging: Record<string, SourcePaging>; }

const resultMessage = (result: ConnectorToolCallResult): string => {
  const text = result.content.flatMap((part) => part.type === "text" && part.text ? [part.text] : []).join("\n").trim();
  const clipped = text.length > RESULT_MESSAGE_CHARS ? `${text.slice(0, RESULT_MESSAGE_CHARS)}…` : text;
  return clipped || (result.isError ? "The action failed." : "Done.");
};

/**
 * Apps: saved specs with versions, their live data (sources shaped in main, rows pushed to the window) and their actions.
 * Interval sources only tick while the window watches the app; everything else loads on demand.
 */
export function createAppService(options: AppServiceOptions): AppService {
  const { store, connectors } = options;
  const data = new Map<string, AppData>();
  const timers = options.timers ?? { setInterval: (callback, ms) => setInterval(callback, ms), clearInterval: (handle) => clearInterval(handle as NodeJS.Timeout) };
  /** Foreground timers run while the window watches the app; background ones run from start-up for sources that opted in. */
  const foregroundTimers = new Map<string, unknown[]>();
  /** One unwatch per file source of an app on screen, so an edited file shows at once. */
  const fileWatchers = new Map<string, (() => void)[]>();
  const backgroundTimers = new Map<string, unknown[]>();
  const inflight = new Map<string, Promise<void>>();

  const subjectOf = (app: Pick<AppDefinition, "workspaceId">): ConnectorSubject => ({ workspaceId: app.workspaceId, botId: null });
  const publish = (): void => options.onChanged(store.list());
  const existing = (id: string): AppDefinition => {
    const app = store.get(id);
    if (!app) throw new Error("This app no longer exists.");
    return app;
  };
  const dataOf = (id: string): AppData => {
    let entry = data.get(id);
    if (!entry) { entry = { sources: {}, states: {}, inputs: {}, paging: {} }; data.set(id, entry); }
    return entry;
  };
  const render = (id: string): AppRenderData => {
    const entry = dataOf(id);
    return { appId: id, sources: { ...entry.sources }, sourceStates: { ...entry.states } };
  };
  const push = (id: string): void => options.onData(render(id));
  const setState = (id: string, sourceId: string, state: AppSourceState): void => { dataOf(id).states[sourceId] = state; };

  /** What a source's select expression sees: a connector tool's result, or a file's rows or JSON. `extra` carries a page's offset or cursor. */
  async function readSource(app: AppDefinition, source: AppSource, inputs: Record<string, JsonValue> | undefined, extra: Record<string, JsonValue> = {}): Promise<JsonValue> {
    if (source.kind === "file") return options.files.read(source.path);
    const result = await connectors.call(source.connectorId, source.tool, { ...resolveSourceArgs(source, inputs), ...extra }, subjectOf(app));
    if (result.isError) throw new ConnectorToolError("tool-failed", resultMessage(result));
    return toolResultInput(result);
  }
  /** After a page: where the next one starts and whether there is one, from the page's rows (offset) or the raw result (cursor). */
  async function pagingAfter(source: AppSource, raw: JsonValue, pageRows: JsonValue, previous: SourcePaging | undefined): Promise<{ paging: SourcePaging; hasMore: boolean }> {
    const count = (previous?.count ?? 0) + (Array.isArray(pageRows) ? pageRows.length : 0);
    if (source.kind !== "connector" || !source.page) return { paging: { count, cursor: null }, hasMore: false };
    if (source.page.kind === "offset") return { paging: { count, cursor: null }, hasMore: Array.isArray(pageRows) && pageRows.length >= source.page.size };
    const cursor = await compileSelect(source.page.next).evaluate(raw);
    const more = cursor !== null && cursor !== undefined && cursor !== "" && cursor !== false;
    return { paging: { count, cursor: more ? cursor : null }, hasMore: more };
  }
  async function loadSource(app: AppDefinition, sourceId: string): Promise<void> {
    const source = app.spec.sources[sourceId];
    if (!source) return;
    const key = `${app.id}:${sourceId}`;
    const running = inflight.get(key);
    if (running) return running;
    const entry = dataOf(app.id);
    const previous = entry.states[sourceId];
    const fetchedAt = previous && "fetchedAt" in previous ? previous.fetchedAt : undefined;
    setState(app.id, sourceId, { status: "loading", ...(fetchedAt ? { fetchedAt } : {}) });
    push(app.id);
    const work = (async () => {
      try {
        const raw = await readSource(app, source, entry.inputs[sourceId]);
        const selected = await selectRows(source.select, raw);
        const { paging, hasMore } = await pagingAfter(source, raw, selected.rows, undefined);
        entry.sources[sourceId] = selected.rows;
        entry.paging[sourceId] = paging;
        setState(app.id, sourceId, { status: "ready", fetchedAt: options.now(), truncated: selected.truncated, hasMore });
        await evaluateAlerts(app, sourceId, selected.rows);
      } catch (error) {
        const kind = error instanceof ConnectorToolError ? error.kind : error instanceof Error && error.message.startsWith("The select expression") ? "select-failed" : "tool-failed";
        setState(app.id, sourceId, { status: "error", kind, message: error instanceof Error && error.message ? error.message : "The source could not be loaded.", ...(fetchedAt ? { fetchedAt } : {}) });
      } finally {
        inflight.delete(key);
        push(app.id);
      }
    })();
    inflight.set(key, work);
    return work;
  }
  /** The next page of a paged source, appended to what is shown; the state keeps its rows while the page loads. */
  async function loadNextPage(app: AppDefinition, sourceId: string): Promise<void> {
    const source = app.spec.sources[sourceId];
    const entry = dataOf(app.id);
    const state = entry.states[sourceId];
    const previous = entry.paging[sourceId];
    if (!source || source.kind !== "connector" || !source.page || state?.status !== "ready" || !state.hasMore || !previous) return;
    const { page: paged } = source;
    const key = `${app.id}:${sourceId}`;
    if (inflight.get(key)) return inflight.get(key);
    setState(app.id, sourceId, { status: "loading", fetchedAt: state.fetchedAt });
    push(app.id);
    const work = (async () => {
      try {
        const extra = paged.kind === "offset" ? { [paged.arg]: previous.count } : { [paged.arg]: previous.cursor ?? null };
        const raw = await readSource(app, source, entry.inputs[sourceId], extra);
        const page = await selectRows(source.select, raw);
        const current = Array.isArray(entry.sources[sourceId]) ? entry.sources[sourceId] : [];
        const combined = [...current, ...(Array.isArray(page.rows) ? page.rows : [])];
        const { paging, hasMore } = await pagingAfter(source, raw, page.rows, previous);
        entry.sources[sourceId] = combined.slice(0, APP_SOURCE_PAGED_ROW_LIMIT);
        entry.paging[sourceId] = paging;
        setState(app.id, sourceId, { status: "ready", fetchedAt: options.now(), truncated: combined.length > APP_SOURCE_PAGED_ROW_LIMIT, hasMore: hasMore && combined.length < APP_SOURCE_PAGED_ROW_LIMIT });
      } catch (error) {
        setState(app.id, sourceId, { status: "error", kind: error instanceof ConnectorToolError ? error.kind : "tool-failed", message: error instanceof Error && error.message ? error.message : "The next page could not be loaded.", fetchedAt: state.fetchedAt });
      } finally { inflight.delete(key); push(app.id); }
    })();
    inflight.set(key, work);
    return work;
  }
  const loadAll = (app: AppDefinition, sourceIds?: readonly string[]): Promise<void[]> =>
    Promise.all((sourceIds ?? Object.keys(app.spec.sources)).map((sourceId) => loadSource(app, sourceId)));

  /** An alert fires when its condition turns true or reports something new, and clears when the condition turns false. */
  async function evaluateAlerts(app: AppDefinition, sourceId: string, rows: JsonValue): Promise<void> {
    let changed = false;
    for (const [alertId, alert] of Object.entries(app.spec.alerts)) {
      if (alert.source !== sourceId) continue;
      const previous = store.alertStates(app.id).find((state) => state.alertId === alertId);
      try {
        const result = await compileAlert(alert)(rows);
        if (!result.active) { if (previous) { store.clearAlertState(app.id, alertId); changed = true; } continue; }
        if (previous?.key === result.key) continue;
        store.putAlertState(app.id, { alertId, key: result.key, title: result.title, detail: result.detail, firedAt: options.now() });
        changed = true;
      } catch (error) { console.error(`Alert ${alertId} of app ${app.name} could not be evaluated`, error); }
    }
    if (changed) options.onAlertsChanged();
  }
  const stopTimers = (map: Map<string, unknown[]>, id: string): void => { for (const timer of map.get(id) ?? []) timers.clearInterval(timer); map.delete(id); };
  const scheduleTimers = (map: Map<string, unknown[]>, app: AppDefinition, background: boolean): void => {
    stopTimers(map, app.id);
    const scheduled = Object.entries(app.spec.sources).flatMap(([sourceId, source]) => source.refresh.kind === "interval" && source.refresh.background === background
      ? [timers.setInterval(() => { const current = store.get(app.id); if (current) void loadSource(current, sourceId); }, source.refresh.seconds * 1000)] : []);
    if (scheduled.length) map.set(app.id, scheduled);
  };
  const startTimers = (app: AppDefinition): void => {
    scheduleTimers(foregroundTimers, app, false);
    for (const stop of fileWatchers.get(app.id) ?? []) stop();
    const watchers = Object.entries(app.spec.sources).flatMap(([sourceId, source]) => source.kind === "file"
      ? [options.files.watch(source.path, () => { const current = store.get(app.id); if (current) void loadSource(current, sourceId); })] : []);
    if (watchers.length) fileWatchers.set(app.id, watchers);
  };
  const stopFileWatchers = (id: string): void => { for (const stop of fileWatchers.get(id) ?? []) stop(); fileWatchers.delete(id); };
  const startBackground = (app: AppDefinition): void => scheduleTimers(backgroundTimers, app, true);
  /** A saved spec replaces the app's data: sources that vanished are dropped and new ones load on the next read; alerts that vanished stop. */
  const resetData = (app: AppDefinition): void => {
    const entry = dataOf(app.id);
    for (const sourceId of Object.keys(entry.states)) if (!app.spec.sources[sourceId]) { delete entry.states[sourceId]; delete entry.sources[sourceId]; delete entry.inputs[sourceId]; delete entry.paging[sourceId]; }
    let alertsChanged = false;
    for (const state of store.alertStates(app.id)) if (!app.spec.alerts[state.alertId]) { store.clearAlertState(app.id, state.alertId); alertsChanged = true; }
    if (alertsChanged) options.onAlertsChanged();
    if (foregroundTimers.has(app.id) || fileWatchers.has(app.id)) startTimers(app);
    startBackground(app);
    void loadAll(app, unboundSources(app));
  };

  const connectorsFor = (workspaceId: string): readonly Connector[] => connectors.available({ workspaceId, botId: null });
  async function validated(input: { spec: AppSpecInput; workspaceId: string; sampleKey: string; allowUnsampled?: boolean }): Promise<AppSpec> {
    const result = await validateAppSpec(input.spec, { connectors: connectorsFor(input.workspaceId),
      sample: (sourceId) => store.sample(input.sampleKey, sourceId)?.result, ...(input.allowUnsampled ? { allowUnsampled: true } : {}) });
    if (!result.spec) throw new Error(`The app spec has problems:\n${describeIssues(result.issues)}`);
    return result.spec;
  }
  const moveSamples = (from: string, to: string, sourceIds: readonly string[]): void => {
    for (const sourceId of sourceIds) { const sample = store.sample(from, sourceId); if (sample) store.putSample(to, sample); }
  };

  /** Sources whose arguments are all literal, so main can load them without the window's inputs. */
  const unboundSources = (app: AppDefinition): string[] => Object.entries(app.spec.sources).flatMap(([sourceId, source]) => sourceHasBoundArgs(source) ? [] : [sourceId]);
  /** The current render data; unbound sources never fetched start loading and arrive on the data channel; bound ones wait for a refresh with inputs. */
  const readData = (id: string): AppRenderData => {
    const app = existing(id);
    const entry = dataOf(id);
    const idle = unboundSources(app).filter((sourceId) => !entry.states[sourceId]);
    if (idle.length) void loadAll(app, idle);
    return render(id);
  };

  const saveNew = (input: { name: string; workspaceId: string; threadId: string | null; spec: AppSpec; suggestions?: readonly string[]; icon?: AppIcon }, summary: string): AppDefinition => {
    const now = options.now();
    const app: AppDefinition = { id: options.nextId(), name: input.name, workspaceId: input.workspaceId, threadId: input.threadId, trusted: false, version: 1,
      suggestions: [...(input.suggestions ?? [])], icon: input.icon ?? DEFAULT_APP_ICON, createdAt: now, updatedAt: now, spec: input.spec };
    store.put(app, summary);
    return app;
  };
  const startNew = (app: AppDefinition): void => { publish(); startBackground(app); void loadAll(app, unboundSources(app)); };

  return {
    list: () => store.list(),
    get: existing,
    connectorsFor,
    async create(input) {
      const sampleKey = input.threadId ? pendingKey(input.threadId) : "";
      const spec = await validated({ spec: input.spec, workspaceId: input.workspaceId, sampleKey });
      const app = saveNew({ ...input, spec }, "Created");
      if (sampleKey) moveSamples(sampleKey, app.id, Object.keys(spec.sources));
      startNew(app);
      return app;
    },
    async import(input) {
      const spec = await validated({ spec: input.spec, workspaceId: input.workspaceId, sampleKey: "", allowUnsampled: true });
      const app = saveNew({ ...input, threadId: null, spec }, "Imported from a file");
      startNew(app);
      return app;
    },
    async update(input) {
      const current = existing(input.id);
      const spec = await validated({ spec: input.spec, workspaceId: current.workspaceId, sampleKey: current.id });
      const app: AppDefinition = { ...current, spec, version: current.version + 1, suggestions: [...(input.suggestions ?? [])], icon: input.icon ?? current.icon, updatedAt: options.now() };
      store.put(app, input.summary);
      publish();
      resetData(app);
      return app;
    },
    movePanel(id, version, move) {
      const current = existing(id);
      if (current.version !== version) throw new Error("The app changed before this move was saved. Try moving the panel again.");
      const ui = moveAppPanel(current.spec.ui, move);
      if (ui === current.spec.ui) return current;
      const app: AppDefinition = { ...current, spec: { ...current.spec, ui }, version: current.version + 1, updatedAt: options.now() };
      store.put(app, "Rearranged panels");
      publish();
      return app;
    },
    rename(id, name) { store.patch({ ...existing(id), name, updatedAt: options.now() }); publish(); },
    setTrusted(id, trusted) { store.patch({ ...existing(id), trusted, updatedAt: options.now() }); publish(); },
    buildStep(threadId, kind, detail) { options.onBuildStep({ threadId, kind, ...(detail ? { detail } : {}), at: options.now() }); },
    attachThread(id, threadId) { const app = existing(id); if (app.threadId !== threadId) { store.patch({ ...app, threadId }); publish(); } },
    remove(id) {
      existing(id);
      stopTimers(foregroundTimers, id); stopTimers(backgroundTimers, id); stopFileWatchers(id); data.delete(id);
      const hadAlerts = store.alertStates(id).length > 0;
      store.remove(id); publish();
      if (hadAlerts) options.onAlertsChanged();
    },
    versions: (id) => { existing(id); return store.versions(id); },
    async restoreVersion(id, version) {
      const current = existing(id);
      const spec = store.versionSpec(id, version);
      if (!spec) throw new Error("That version no longer exists.");
      const app: AppDefinition = { ...current, spec, version: current.version + 1, updatedAt: options.now() };
      store.put(app, `Restored version ${version}`);
      publish();
      resetData(app);
      return app;
    },
    data: readData,
    async refresh(id, sourceIds, inputs) {
      const app = existing(id);
      const entry = dataOf(id);
      for (const [sourceId, values] of Object.entries(inputs ?? {})) if (app.spec.sources[sourceId]) entry.inputs[sourceId] = values;
      await loadAll(app, sourceIds?.filter((sourceId) => app.spec.sources[sourceId]));
      return render(id);
    },
    async loadMore(id, sourceId) { await loadNextPage(existing(id), sourceId); return render(id); },
    async runAction(id, actionId, args, confirmed = true) {
      const app = existing(id);
      const action = app.spec.actions[actionId];
      if (!action) throw new Error("This action is no longer part of the app.");
      let result: AppActionResult;
      let logged: string;
      try {
        const outcome = describeActionOutcome(await connectors.call(action.connectorId, action.tool, args, subjectOf(app)));
        result = { message: outcome.summary, isError: outcome.isError };
        logged = outcome.full;
      } catch (error) {
        result = { message: error instanceof Error && error.message ? error.message : "The action failed.", isError: true };
        logged = result.message;
      }
      const connectorName = connectorsFor(app.workspaceId).find((entry) => entry.id === action.connectorId)?.name ?? action.connectorId;
      store.putActivity(app.id, { at: options.now(), actionId, tool: action.tool, connectorName, args, confirmed, ok: !result.isError, message: logged });
      if (!result.isError && action.refreshSources.length) void loadAll(app, action.refreshSources);
      return result;
    },
    activity: (id) => { existing(id); return store.activity(id); },
    async sample(input) {
      let result: JsonValue;
      if (input.kind === "file") result = await options.files.read(input.path);
      else {
        const reply = await connectors.call(input.connectorId, input.tool, input.args, input.subject);
        if (reply.isError) throw new Error(resultMessage(reply));
        result = toolResultInput(reply);
      }
      const serialised = JSON.stringify(result);
      if (serialised.length > APP_SAMPLE_MAX_BYTES) throw new Error(`The result is ${serialised.length.toLocaleString()} bytes, more than the ${APP_SAMPLE_MAX_BYTES.toLocaleString()} allowed for a sample. Narrow the call with its arguments (a limit, a filter or a date range).`);
      store.putSample(input.appId ?? pendingKey(input.threadId), { sourceId: input.sourceId, sampledAt: options.now(), result });
      return result;
    },
    watch(id) {
      const app = existing(id);
      if (!foregroundTimers.has(id) && !fileWatchers.has(id)) startTimers(app);
      readData(id);
    },
    unwatch: (id) => { stopTimers(foregroundTimers, id); stopFileWatchers(id); },
    activeAlerts: () => store.allAlertStates().flatMap(({ appId, state }) => {
      const app = store.get(appId);
      const alert = app?.spec.alerts[state.alertId];
      return app && alert ? [{ appId, appName: app.name, workspaceId: app.workspaceId, alertId: state.alertId, title: state.title, detail: state.detail, tier: alert.tier, firedAt: state.firedAt }] : [];
    }),
    start() { for (const summary of store.list()) { const app = store.get(summary.id); if (app) startBackground(app); } },
    close() {
      for (const id of [...foregroundTimers.keys()]) stopTimers(foregroundTimers, id);
      for (const id of [...backgroundTimers.keys()]) stopTimers(backgroundTimers, id);
      for (const id of [...fileWatchers.keys()]) stopFileWatchers(id);
    }
  };
}

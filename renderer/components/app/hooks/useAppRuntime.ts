import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createStateStore } from "@json-render/core";
import { appsClient } from "@/components/app/clients/appsClient";
import { resolveActionArgs } from "@/components/app/logic/apps/resolveActionArgs";
import { boundSourceArgs, changedSourceInputs, resolveSourceInputs } from "@/components/app/logic/apps/sourceInputs";
import type { AppDefinition, AppRenderData, AppSourceInputs } from "@shared/types/apps/apps.types";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { JsonValue } from "@main/jsonValue";
import type { AppActionOutcome, AppRuntime, AppsClient, PendingAppAction } from "@/components/app/types/apps.types";

const errorText = (error: unknown, fallback: string): string => error instanceof Error && error.message ? error.message : fallback;
/** A filter change reloads its sources after typing settles. */
/** How old a source may be before coming back to the window reloads it. */
const STALE_AFTER_MS = 60_000;
const INPUT_DEBOUNCE_MS = 350;

/**
 * One open app. Main owns the data: this hook mirrors each source's rows and state into the json-render store the UI reads
 * (`/sources/<id>`, `/sourceStatus/<id>`), keeps the app watched while mounted so interval sources tick, and runs its actions.
 */
export function useAppRuntime(appId: string, connectors: readonly Connector[], client: AppsClient = appsClient): AppRuntime {
  const store = useMemo(() => createStateStore({ sources: {}, sourceStatus: {}, form: {} }), []);
  const [app, setApp] = useState<AppDefinition | null>(null);
  const [data, setData] = useState<AppRenderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAppAction | null>(null);
  const [outcome, setOutcome] = useState<AppActionOutcome | null>(null);
  const appRef = useRef(app);
  appRef.current = app;
  const dataRef = useRef(data);
  dataRef.current = data;
  const refreshRef = useRef<(sourceIds?: readonly string[]) => void>(() => undefined);
  const inputsRef = useRef<AppSourceInputs | null>(null);
  const seededInputsRef = useRef<string | null>(null);
  const bound = useMemo(() => app ? boundSourceArgs(app.spec) : {}, [app]);

  const applyData = useCallback((next: AppRenderData) => {
    setData(next);
    store.update({ "/sources": { ...next.sources }, "/sourceStatus": { ...next.sourceStates } });
  }, [store]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setApp(null); setData(null); setPending(null); setOutcome(null);
    seededInputsRef.current = null;
    const unsubscribeData = client.onData((next) => { if (active && next.appId === appId) applyData(next); });
    const unsubscribeChanged = client.onChanged((apps) => {
      // A new version from the builder, a rename or a trust change: reload the definition so the UI follows.
      const summary = apps.find((entry) => entry.id === appId);
      if (!active || !summary) return;
      const current = appRef.current;
      if (!current || current.version !== summary.version || current.name !== summary.name || current.trusted !== summary.trusted || current.threadId !== summary.threadId) {
        client.request({ kind: "get", id: appId }).then((reply) => { if (active && reply.kind === "app") { setApp(reply.app); applyData(reply.data); } }, () => undefined);
      }
    });
    client.request({ kind: "get", id: appId }).then((reply) => {
      if (!active || reply.kind !== "app") return;
      setApp(reply.app); applyData(reply.data); setLoading(false);
      void client.request({ kind: "watch", id: appId }).catch(() => undefined);
    }, (cause: unknown) => { if (active) { setError(errorText(cause, "The app could not be opened.")); setLoading(false); } });
    return () => { active = false; unsubscribeData(); unsubscribeChanged(); void client.request({ kind: "unwatch", id: appId }).catch(() => undefined); };
  }, [appId, client, applyData]);

  // Coming back to the window after a while reloads what has gone stale, so a tool left open over lunch is current when looked at.
  useEffect(() => {
    const onReturn = (): void => {
      if (document.visibilityState !== "visible") return;
      const states = dataRef.current?.sourceStates ?? {};
      const stale = Object.values(states).some((state) => state.status === "ready" && Date.now() - Date.parse(state.fetchedAt) > STALE_AFTER_MS);
      if (stale) refreshRef.current();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => { document.removeEventListener("visibilitychange", onReturn); window.removeEventListener("focus", onReturn); };
  }, []);

  /** Every reload carries the current values of bound arguments, so main always calls with what the user has set. */
  const refresh = useCallback((sourceIds?: readonly string[]) => {
    const inputs = resolveSourceInputs(bound, store.getSnapshot());
    inputsRef.current = inputs;
    client.request({ kind: "refresh", id: appId, ...(sourceIds ? { sourceIds: [...sourceIds] } : {}), ...(Object.keys(inputs).length ? { inputs } : {}) })
      .then((reply) => { if (reply.kind === "data") applyData(reply.data); }, (cause: unknown) => setError(errorText(cause, "The app could not be refreshed.")));
  }, [appId, client, applyData, bound, store]);
  refreshRef.current = refresh;

  // A shared app may open before its recipient signs in. Retry only sources waiting for that account.
  const connectedIds = connectors.filter((connector) => connector.status === "connected").map((connector) => connector.id).sort().join(",");
  useEffect(() => {
    if (!app) return;
    const connected = new Set(connectedIds.split(","));
    const waiting = Object.entries(app.spec.sources).filter(([id, source]) => {
      const state = dataRef.current?.sourceStates[id];
      return source.kind === "connector" && connected.has(source.connectorId) && state?.status === "error" && state.kind === "needs-auth";
    }).map(([id]) => id);
    if (waiting.length) refresh(waiting);
  }, [app, connectedIds, refresh]);

  // Layout versions keep the user's filters and selections; seed only when defaults or source bindings change.
  useEffect(() => {
    if (!app) return;
    const signature = JSON.stringify([app.id, app.spec.ui.state, bound]);
    if (seededInputsRef.current === signature) return;
    seededInputsRef.current = signature;
    const initial = app.spec.ui.state;
    if (initial) store.update(Object.fromEntries(Object.entries(initial).filter(([key]) => key !== "sources" && key !== "sourceStatus").map(([key, value]) => [`/${key}`, value])));
    inputsRef.current = null;
    const boundIds = Object.keys(bound);
    if (boundIds.length) refresh(boundIds);
  }, [app, bound, store, refresh]);

  // Changing a bound value (a filter, a search box) reloads only the sources that read it, once typing settles.
  useEffect(() => {
    if (!Object.keys(bound).length) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = store.subscribe(() => {
      const next = resolveSourceInputs(bound, store.getSnapshot());
      const changed = changedSourceInputs(inputsRef.current, next);
      if (!changed.length) return;
      clearTimeout(timer);
      timer = setTimeout(() => refresh(changed), INPUT_DEBOUNCE_MS);
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [bound, store, refresh]);

  const execute = useCallback((actionId: string, args: Record<string, JsonValue>, confirmed: boolean) => {
    client.request({ kind: "run-action", run: { appId, actionId, args, confirmed } }).then((reply) => { if (reply.kind === "action") setOutcome({ ...reply.result, actionId, at: Date.now() }); },
      (cause: unknown) => setOutcome({ actionId, message: errorText(cause, "The action failed."), isError: true, at: Date.now() }));
  }, [appId, client]);

  const runAction = useCallback((actionId: string, item: JsonValue | undefined) => {
    const current = appRef.current;
    const action = current?.spec.actions[actionId];
    if (!current || !action) { setOutcome({ actionId, message: "This action is no longer part of the app.", isError: true, at: Date.now() }); return; }
    const args = resolveActionArgs(action, store.getSnapshot(), item);
    if (current.trusted) { execute(actionId, args, false); return; }
    setPending({ actionId, action, args, connectorName: connectors.find((connector) => connector.id === action.connectorId)?.name ?? "the connector" });
  }, [connectors, execute, store]);

  const loadMore = useCallback((sourceId: string) => {
    client.request({ kind: "load-more", id: appId, sourceId }).then((reply) => { if (reply.kind === "data") applyData(reply.data); }, (cause: unknown) => setError(errorText(cause, "The next page could not be loaded.")));
  }, [appId, client, applyData]);

  return useMemo<AppRuntime>(() => ({ app, data, store, loading, error, pending, outcome, refresh, loadMore, runAction,
    confirmPending: () => { if (pending) { execute(pending.actionId, pending.args, true); setPending(null); } },
    cancelPending: () => setPending(null),
    dismissOutcome: () => setOutcome(null),
    versions: async () => { const reply = await client.request({ kind: "list-versions", id: appId }); return reply.kind === "versions" ? reply.versions : []; },
    restoreVersion: async (version) => { const reply = await client.request({ kind: "restore-version", id: appId, version }); if (reply.kind === "app") { setApp(reply.app); applyData(reply.data); } },
    movePanel: async (move) => {
      const current = appRef.current;
      if (!current) throw new Error("The app is still opening.");
      const reply = await client.request({ kind: "move-panel", id: appId, version: current.version, ...move });
      if (reply.kind !== "app") throw new Error("The panel layout could not be saved.");
      appRef.current = reply.app;
      setApp(reply.app);
    },
    activity: async () => { const reply = await client.request({ kind: "list-activity", id: appId }); return reply.kind === "activity" ? reply.entries : []; }
  }), [app, data, store, loading, error, pending, outcome, refresh, loadMore, runAction, execute, client, appId, applyData]);
}

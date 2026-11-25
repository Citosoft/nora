import { finishedRuns, inboxTier, projectInbox } from "@shared/inbox/projection";
import { SNOOZE_MAX_MS } from "@shared/inbox/contracts";
import type { InboxCommand, InboxItem, InboxLedger, InboxMark, InboxSnapshot, InboxSources, InboxWorkflowSource } from "@shared/types/inbox/inbox.types";
import type { InboxService, InboxServiceDeps } from "@main/types/inbox/inbox.types";
import { readRequestSources, refreshPreviews, toWorkflowSource } from "./sources";

/** Coalesces bursts of events (a run finishing touches its run, requests and thread) into one rebuild. */
const REBUILD_DELAY_MS = 50;
/** Timers longer than this overflow; a far-off snooze is checked again after a day. */
const WAKE_DELAY_MAX_MS = 24 * 60 * 60 * 1000;

/**
 * Owns the inbox in main: rebuilds it from the execution host, workflow runs and connectors whenever they change, and keeps
 * the user's marks. Runs whether or not a window is open, so updates that arrive in the background are not missed.
 */
export function createInboxService(deps: InboxServiceDeps): InboxService {
  const stored = deps.ledger.read();
  // The first start sets the baseline: what finished before the inbox existed is not news.
  let ledger: InboxLedger = stored ?? { version: 1, baselineAt: deps.now(), marks: {} };
  const workflows = new Map<string, InboxWorkflowSource>();
  const previews = new Map<string, string | null>();
  const listeners = new Set<(snapshot: InboxSnapshot) => void>();
  // Until stored workflow runs are read, their items are missing; marks for them must not be pruned meanwhile.
  let workflowsLoaded = false;
  let followingThreads = false;
  let threadSources: Pick<InboxSources, "summaries" | "requests"> | null = null;
  let snapshot: InboxSnapshot = { items: [] };
  let signature = "";
  let pending: { cancel(): void } | null = null;
  let wake: { cancel(): void } | null = null;
  const save = (next: InboxLedger): void => {
    ledger = next;
    try { deps.ledger.write(next); } catch (error) { console.error("Inbox marks could not be saved", error); }
  };
  const rebuild = (): void => {
    pending?.cancel(); pending = null;
    const now = deps.now();
    if (!followingThreads || !threadSources) {
      const summaries = deps.host.summaries();
      threadSources = { summaries: finishedRuns(summaries, ledger.baselineAt, now), requests: readRequestSources(deps.host, summaries) };
    }
    const { summaries } = threadSources;
    refreshPreviews(deps.host, previews, summaries, ledger.baselineAt, now);
    const projection = projectInbox({ ...threadSources, workflows: [...workflows.values()],
      connectors: deps.connectors(), alerts: deps.alerts(), previews }, ledger, now);
    if (workflowsLoaded && Object.keys(projection.marks).length !== Object.keys(ledger.marks).length) save({ ...ledger, marks: projection.marks });
    snapshot = projection.snapshot;
    scheduleWake(now);
    const next = JSON.stringify(snapshot);
    if (next === signature) return;
    signature = next;
    for (const listener of [...listeners]) {
      try { listener(snapshot); } catch (error) { console.error("An inbox listener failed", error); }
    }
  };
  const schedule = (): void => { if (!pending) pending = deps.setTimeout(rebuild, REBUILD_DELAY_MS); };
  /** Snoozed items come back on their own when their snooze ends. */
  const scheduleWake = (now: string): void => {
    wake?.cancel(); wake = null;
    const next = snapshot.items.reduce<string | null>((soonest, item) => item.snoozedUntil && (!soonest || item.snoozedUntil < soonest) ? item.snoozedUntil : soonest, null);
    if (next) wake = deps.setTimeout(rebuild, Math.min(WAKE_DELAY_MAX_MS, Math.max(0, Date.parse(next) - Date.parse(now))));
  };
  const mark = (ids: readonly string[], change: (item: InboxItem, current: InboxMark) => InboxMark | null): InboxSnapshot => {
    const items = new Map(snapshot.items.map((item) => [item.id, item]));
    const marks = { ...ledger.marks };
    let changed = false;
    for (const id of ids) {
      const item = items.get(id);
      if (!item) continue;
      const next = change(item, marks[id] ?? {});
      if (!next) continue;
      marks[id] = next; changed = true;
    }
    if (!changed) return snapshot;
    save({ ...ledger, marks });
    rebuild();
    return snapshot;
  };
  const updatesOnly = (item: InboxItem): boolean => inboxTier(item) === "update";
  const unread = ({ readAt: _readAt, ...rest }: InboxMark): InboxMark => rest;
  const awake = ({ snoozedUntil: _snoozedUntil, ...rest }: InboxMark): InboxMark => rest;

  return {
    snapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    execute(command: InboxCommand) {
      const now = deps.now();
      switch (command.kind) {
        case "mark-read": return mark(command.itemIds, (item, current) => updatesOnly(item) && !item.readAt ? { ...current, readAt: now } : null);
        case "mark-unread": return mark(command.itemIds, (item, current) => updatesOnly(item) && item.readAt ? unread(current) : null);
        case "mark-thread-read": return mark(snapshot.items.flatMap((item) => item.kind === "outcome" && item.conversation.id === command.conversationId ? [item.id] : []),
          (item, current) => item.readAt ? null : { ...current, readAt: now });
        case "mark-done": {
          const blocked = command.itemIds.some((id) => snapshot.items.some((item) => item.id === id && !updatesOnly(item)));
          if (blocked) throw new Error("This item clears once it is resolved. Snooze it to set it aside for now.");
          return mark(command.itemIds, (_item, current) => ({ ...current, readAt: current.readAt ?? now, doneAt: now }));
        }
        case "snooze": {
          const until = Date.parse(command.until), from = Date.parse(now);
          if (until <= from) throw new Error("Choose a time in the future to snooze until.");
          if (until - from > SNOOZE_MAX_MS) throw new Error("Items can be snoozed for up to 30 days.");
          return mark(command.itemIds, (_item, current) => ({ ...current, snoozedUntil: command.until }));
        }
        case "unsnooze": return mark(command.itemIds, (item, current) => item.snoozedUntil ? awake(current) : null);
      }
    },
    observeWorkflowRun(run) { workflows.set(run.id, toWorkflowSource(run, deps.workspaceForProject(run.projectId))); schedule(); },
    forgetWorkflowRun(runId) { if (workflows.delete(runId)) schedule(); },
    refreshConnectors: schedule,
    refreshAlerts: schedule,
    start() {
      threadSources = null;
      followingThreads = true;
      let stopped = false;
      const unsubscribe = deps.host.subscribe({ after: deps.host.eventCursor(), onError: (error) => { followingThreads = false; console.error("The inbox stopped following threads", error); },
        // Streamed timeline items do not change the inbox; runs, requests and threads do.
        onEvent: (event) => { if (event.payload.kind !== "item") { threadSources = null; schedule(); } } });
      deps.listWorkflowRuns()
        .then((runs) => { if (stopped) return; for (const run of runs) if (!workflows.has(run.id)) workflows.set(run.id, toWorkflowSource(run, deps.workspaceForProject(run.projectId))); })
        .catch((error: unknown) => console.error("Workflow runs could not be read for the inbox", error))
        .finally(() => { if (stopped) return; workflowsLoaded = true; schedule(); });
      if (!stored) save(ledger);
      rebuild();
      return () => { stopped = true; followingThreads = false; threadSources = null; unsubscribe(); pending?.cancel(); wake?.cancel(); pending = null; wake = null; };
    }
  };
}

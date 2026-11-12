import { setThreadSettlement } from "./settlement";
import { importExternalSession, pinExternalSession } from "./externalSessions";
import { unreadCompletions } from "./unread";
import { effectiveRole } from "@shared/personalization/profiles";
import { threadLayoutSchema } from "./schema";
import { emptyThreadLayout } from "./persistence";
import { closeThreadDocument, createThreadDraft, focusThreadDocument, openThreadDocument } from "./changes";
import type { ThreadWorkspaceDeps, ThreadWorkspaceStore, ThreadWorkspaceSnapshot, ThreadLayout, ThreadDocumentRuntime } from "@/components/app/types/thread-workspace/state.types";
import type { ThreadWorkspaceInternals } from "@/components/app/types/thread-workspace/internals.types";
import { createThreadSubmission } from "./submission";

/** Shared presentation owner. It holds drafts/views, never provider execution or transcript copies. */
export function createThreadWorkspaceStore(deps: ThreadWorkspaceDeps): ThreadWorkspaceStore {
  let layout = emptyThreadLayout(deps.boot.environmentId);
  let storageError: string | null = null;
  let corrupt = false;
  try {
    const restored = deps.persistence.read();
    if (restored) {
      const parsed = threadLayoutSchema.parse(restored);
      if (parsed.environmentId !== deps.boot.environmentId) throw new Error("Thread views belong to another execution host");
      layout = parsed;
    }
  }
  catch { corrupt = true; storageError = "Saved thread views could not be read. Their source has been preserved; fix or recover it before sending."; }
  let state: ThreadWorkspaceSnapshot = { boot: deps.boot, focusRevision: 0, unreadThreadIds: [], layout, summaries: [], runtime: {}, loading: true, error: null, storageError };
  let windowFocused = true, threadVisible = true;
  const listeners = new Set<() => void>();
  let users = 0, epoch = 0, sequence = 0, scheduled = false;
  let stop = (): void => {};
  const publish = (next: ThreadWorkspaceSnapshot): void => {
    const active = next.layout.documents.find((entry) => entry.id === next.layout.activeId);
    const viewedId = windowFocused && threadVisible && active?.target.kind === "thread" ? active.target.conversationId : null;
    state = { ...next, unreadThreadIds: next.unreadThreadIds.filter((id) => id !== viewedId) };
    for (const listener of [...listeners]) { try { listener(); } catch { /* A view cannot change accepted execution. */ } }
  };
  const runtime = (id: string): ThreadDocumentRuntime => Object.hasOwn(state.runtime, id) ? state.runtime[id] : { busy: false, readyBinding: null, error: null };
  const setRuntime: ThreadWorkspaceInternals["setRuntime"] = (id, change) => publish({ ...state, runtime: { ...state.runtime, [id]: { ...runtime(id), ...change } } });
  const save = (next: ThreadLayout): boolean => {
    const parsed = threadLayoutSchema.safeParse(next);
    if (!parsed.success) { publish({ ...state, storageError: "Thread view state is inconsistent and has not been saved." }); return false; }
    if (corrupt) { publish({ ...state, layout: parsed.data }); return false; }
    try { deps.persistence.write(parsed.data); publish({ ...state, layout: parsed.data, storageError: null }); return true; }
    catch { publish({ ...state, layout: parsed.data, storageError: "Drafts could not be saved. Your text is retained here; retry when storage is available." }); return false; }
  };
  let latestRefresh: Promise<void> = Promise.resolve();
  const readSummaries = async (): Promise<void> => {
    const current = ++sequence, generation = epoch;
    try {
      const summaries = await deps.client.summaries();
      if (current === sequence && generation === epoch) publish({ ...state, summaries, unreadThreadIds: unreadCompletions(state, summaries), loading: false, error: null });
    } catch (cause) {
      if (current === sequence && generation === epoch) publish({ ...state, loading: false, error: cause instanceof Error ? cause.message : "Threads could not be loaded from their execution host." });
    }
  };
  /**
   * Resolves once the newest refresh has published. A reply superseded by a later read (for example one scheduled
   * by the events a create emits) is discarded, so callers wait for that later read instead of acting on stale rows.
   */
  const refresh = async (): Promise<void> => {
    let work = readSummaries();
    latestRefresh = work;
    await work;
    while (latestRefresh !== work) { work = latestRefresh; await work; }
  };
  const scheduleRefresh = (): void => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; if (users) void refresh(); });
  };
  const internal: ThreadWorkspaceInternals = { deps, snapshot: () => state, runtime, setRuntime, save, refresh: scheduleRefresh };
  const submission = createThreadSubmission(internal);
  const store: ThreadWorkspaceStore = {
    client: deps.client,
    async setSettled(target, settled) { await setThreadSettlement(internal, target, settled); await refresh(); },
    resumeExternal: (workspaceId, session) => importExternalSession(deps, store, workspaceId, session),
    pinExternal: (workspaceId, session) => pinExternalSession(deps, store, workspaceId, session),
    snapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() {
      if (++users === 1) {
        epoch++;
        stop = deps.client.subscribe({ after: state.boot.cursor, onEvent: (event) => { if (event.payload.kind !== "item") scheduleRefresh(); },
          onError: (cause) => publish({ ...state, error: cause.message }) });
        scheduleRefresh();
      }
      let closed = false;
      return () => { if (closed) return; closed = true; if (--users === 0) { epoch++; stop(); } };
    },
    refresh,
    updateBoot(boot) {
      if (boot.environmentId !== state.boot.environmentId) throw new Error("Thread views cannot move between execution hosts.");
      publish({ ...state, boot });
      save({ ...state.layout, documents: state.layout.documents.map((entry) => entry.target.kind === "draft" && !entry.pending
        ? { ...entry, role: effectiveRole(boot.personalization, entry.workspaceId) ?? entry.role } : entry) });
    },
    openDraft(input) {
      try {
        const existing = !input.text && !input.provider && !input.source ? state.layout.documents.find((entry) => entry.workspaceId === input.workspaceId
          && entry.target.kind === "draft" && !entry.text && !entry.pending) : undefined;
        const document = existing ?? createThreadDraft(state.boot, input, `draft:${deps.nextId()}`, deps.now());
        save(focusThreadDocument({ ...state.layout, documents: existing ? state.layout.documents : [...state.layout.documents, document] }, document));
        publish({ ...state, focusRevision: state.focusRevision + 1 });
        return document.id;
      } catch (cause) { publish({ ...state, error: cause instanceof Error ? cause.message : "New thread could not be opened." }); return null; }
    },
    openThread(conversationId) {
      const existing = state.layout.documents.find((entry) => (entry.target.kind === "thread" && entry.target.conversationId === conversationId)
        || entry.pending?.submit.conversationId === conversationId);
      if (existing) { save(focusThreadDocument(state.layout, existing)); publish({ ...state, focusRevision: state.focusRevision + 1 }); return existing.id; }
      const summary = state.summaries.find((entry) => entry.conversation.id === conversationId);
      if (!summary || summary.conversation.workspace.environmentId !== state.boot.environmentId) {
        publish({ ...state, error: "This thread is unavailable on its owning host." }); return null;
      }
      const document = openThreadDocument(summary, `thread:${deps.nextId()}`);
      save(focusThreadDocument({ ...state.layout, documents: [...state.layout.documents, document] }, document)); publish({ ...state, focusRevision: state.focusRevision + 1 }); return document.id;
    },
    focusDocument(id) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (document) { save(focusThreadDocument(state.layout, document)); publish({ ...state, focusRevision: state.focusRevision + 1 }); }
    },
    focusWorkspace(id) {
      if (!state.boot.workspaces.some((entry) => entry.id === id)) return;
      const activeId = state.layout.openIds.filter((key) => state.layout.documents.find((entry) => entry.id === key)?.workspaceId === id).at(-1) ?? null;
      save({ ...state.layout, focusedWorkspaceId: id, activeId });
    },
    setWindowFocused(focused) { windowFocused = focused; publish(state); },
    setThreadVisible(visible) { threadVisible = visible; publish(state); },
    deactivate() { save({ ...state.layout, activeId: null }); },
    closeDocument(id) { save(closeThreadDocument(state.layout, id)); },
    discardDraft(id) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (!document || document.target.kind !== "draft") return;
      if (document.pending || runtime(id).busy) { setRuntime(id, { error: "Confirm delivery before discarding this instruction." }); return; }
      save({ ...closeThreadDocument(state.layout, id), documents: state.layout.documents.filter((entry) => entry.id !== id) });
    },
    setText(id, text) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (!document || document.pending) return;
      if (text.length > 2_000_000) { setRuntime(id, { error: "This draft exceeds the text limit." }); return; }
      save({ ...state.layout, documents: state.layout.documents.map((entry) => entry.id === id ? { ...entry, text, updatedAt: deps.now() } : entry) });
    },
    setBinding(id, binding) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (!document) return;
      setRuntime(id, { readyBinding: binding });
      if (binding && !document.pending && !runtime(id).busy && JSON.stringify(binding) !== JSON.stringify(document.provider)) {
        save({ ...state.layout, documents: state.layout.documents.map((entry) => entry.id === id ? { ...entry, provider: binding } : entry) });
      }
    },
    selectWorkspace(id, workspaceId) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      const workspace = state.boot.workspaces.find((entry) => entry.id === workspaceId);
      if (!workspace || !document || document.target.kind !== "draft" || document.pending || runtime(id).busy) return;
      const role = effectiveRole(state.boot.personalization, workspaceId);
      if (!role) { setRuntime(id, { error: "Choose a workspace role before sending." }); return; }
      setRuntime(id, { readyBinding: null });
      save({ ...state.layout, focusedWorkspaceId: workspaceId, documents: state.layout.documents.map((entry) => entry.id === id ? { ...entry, workspaceId, role } : entry) });
    },
    setPinned(conversationId, pinned) {
      const pins = state.layout.pinnedThreadIds;
      if (pins.includes(conversationId) === pinned) return;
      save({ ...state.layout, pinnedThreadIds: pinned ? [...pins, conversationId] : pins.filter((id) => id !== conversationId) });
    },
    togglePin(conversationId) { store.setPinned(conversationId, !state.layout.pinnedThreadIds.includes(conversationId)); },
    ...submission
  };
  return store;
}

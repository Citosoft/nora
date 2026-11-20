import { sameProviderBinding } from "@shared/conversations/providerBinding";
import { COMPOSER_ATTACHMENT_MAX_COUNT } from "@shared/composerAttachments";
import { setThreadSettlement } from "./settlement";
import { createThreadReferences } from "./references";
import { importExternalSession, pinExternalSession } from "./externalSessions";
import { effectiveRole } from "@shared/personalization/profiles";
import { findEffectiveBot } from "@shared/bots/catalog";
import { threadLayoutSchema } from "./schema";
import { findDirectChat } from "@shared/bots/directChats";
import { emptyThreadLayout } from "./persistence";
import { closeThreadDocument, createThreadDraft, focusThreadDocument, isEmptyDraft, openThreadDocument } from "./changes";
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
    // Unread updates come from the inbox; the thread on screen is read as soon as it is seen.
    const unread = deps.unread.unreadThreadIds();
    if (viewedId && unread.includes(viewedId)) deps.unread.markThreadRead(viewedId);
    state = { ...next, unreadThreadIds: viewedId ? unread.filter((id) => id !== viewedId) : unread };
    for (const listener of [...listeners]) { try { listener(); } catch { /* A view cannot change accepted execution. */ } }
  };
  const runtime = (id: string): ThreadDocumentRuntime => Object.hasOwn(state.runtime, id) ? state.runtime[id] : { busy: false, readyBinding: null, error: null };
  const setRuntime: ThreadWorkspaceInternals["setRuntime"] = (id, change) => publish({ ...state, runtime: { ...state.runtime, [id]: { ...runtime(id), ...change } } });
  const save = (next: ThreadLayout): boolean => {
    const parsed = threadLayoutSchema.safeParse(next);
    if (!parsed.success) { publish({ ...state, storageError: "Thread view state is inconsistent and has not been saved." }); return false; }
    // Validation clones the entire layout; retain structural sharing in the live snapshot.
    if (corrupt) { publish({ ...state, layout: next }); return false; }
    try { deps.persistence.write(parsed.data); publish({ ...state, layout: next, storageError: null }); return true; }
    catch { publish({ ...state, layout: next, storageError: "Drafts could not be saved. Your text is retained here; retry when storage is available." }); return false; }
  };
  /** Focuses an open document; a direct chat moves to the focused workspace first, since it works in every workspace. */
  const focusDocumentHere = (document: ThreadLayout["documents"][number], followsUser: boolean): void => {
    const focused = state.layout.focusedWorkspaceId;
    const here = followsUser && focused && document.workspaceId !== focused ? { ...document, workspaceId: focused } : document;
    const layout = here === document ? state.layout : { ...state.layout, documents: state.layout.documents.map((entry) => entry.id === document.id ? here : entry) };
    save(focusThreadDocument(layout, here));
    publish({ ...state, focusRevision: state.focusRevision + 1 });
  };
  let latestRefresh: Promise<void> = Promise.resolve();
  const readSummaries = async (): Promise<void> => {
    const current = ++sequence, generation = epoch;
    try {
      const summaries = await deps.client.summaries();
      if (current === sequence && generation === epoch) publish({ ...state, summaries, loading: false, error: null });
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
    async renameThread(conversationId, title) {
      await deps.client.execute({ kind: "rename", commandId: deps.nextId(), conversationId, title });
      await refresh();
    },
    resumeExternal: (workspaceId, session) => importExternalSession(deps, store, workspaceId, session),
    pinExternal: (workspaceId, session) => pinExternalSession(deps, store, workspaceId, session),
    snapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() {
      if (++users === 1) {
        epoch++;
        const stopEvents = deps.client.subscribe({ after: state.boot.cursor, onEvent: (event) => { if (event.payload.kind !== "item") scheduleRefresh(); },
          onError: (cause) => publish({ ...state, error: cause.message }) });
        const stopUnread = deps.unread.subscribe(() => publish(state));
        stop = () => { stopEvents(); stopUnread(); };
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
        const existing = !input.text && !input.provider && !input.source && !input.group ? state.layout.documents.find((entry) => entry.workspaceId === input.workspaceId
          && isEmptyDraft(entry) && entry.direct?.botId === input.direct?.botId) : undefined;
        const document = existing ?? createThreadDraft(state.boot, input, `draft:${deps.nextId()}`, deps.now());
        save(focusThreadDocument({ ...state.layout, documents: existing ? state.layout.documents : [...state.layout.documents, document] }, document));
        publish({ ...state, focusRevision: state.focusRevision + 1 });
        return document.id;
      } catch (cause) { publish({ ...state, error: cause instanceof Error ? cause.message : "New thread could not be opened." }); return null; }
    },
    openThread(conversationId) {
      const summary = state.summaries.find((entry) => entry.conversation.id === conversationId);
      const existing = state.layout.documents.find((entry) => (entry.target.kind === "thread" && entry.target.conversationId === conversationId)
        || entry.pending?.submit.conversationId === conversationId);
      if (existing) {
        focusDocumentHere(existing, !!summary?.conversation.direct);
        return existing.id;
      }
      if (!summary || summary.conversation.workspace.environmentId !== state.boot.environmentId) {
        publish({ ...state, error: "This thread is unavailable on its owning host." }); return null;
      }
      const document = openThreadDocument(summary, `thread:${deps.nextId()}`, state.layout.focusedWorkspaceId);
      save(focusThreadDocument({ ...state.layout, documents: [...state.layout.documents, document] }, document)); publish({ ...state, focusRevision: state.focusRevision + 1 }); return document.id;
    },
    openDirect(workspaceId, botId) {
      const bot = findEffectiveBot(state.boot.personalization.bots, workspaceId, state.boot.sharedBots, botId);
      if (!bot) { publish({ ...state, error: "This bot is not available in this workspace." }); return null; }
      const chat = findDirectChat(state.summaries, bot);
      if (chat) return store.openThread(chat.conversation.id);
      const draft = state.layout.documents.find((entry) => entry.target.kind === "draft" && entry.direct?.botId === botId);
      if (draft) { focusDocumentHere(draft, true); return draft.id; }
      return store.openDraft({ workspaceId, direct: { botId } });
    },
    focusDocument(id) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (document) { save(focusThreadDocument(state.layout, document)); publish({ ...state, focusRevision: state.focusRevision + 1 }); }
    },
    focusWorkspace(id) {
      // Startup registers the restored workspace again; keep its saved selection, including an inactive thread surface.
      if (state.layout.focusedWorkspaceId === id) return;
      if (!state.boot.workspaces.some((entry) => entry.id === id)) return;
      const activeId = state.layout.openIds.filter((key) => state.layout.documents.find((entry) => entry.id === key)?.workspaceId === id).at(-1) ?? null;
      save({ ...state.layout, focusedWorkspaceId: id, activeId });
    },
    setWindowFocused(focused) { windowFocused = focused; publish(state); },
    setThreadVisible(visible) { threadVisible = visible; publish(state); },
    deactivate() { save({ ...state.layout, activeId: null }); },
    showHome() {
      save({ ...state.layout, activeId: null });
      publish({ ...state, focusRevision: state.focusRevision + 1 });
    },
    closeDocument(id) {
      // An empty draft has nothing to come back to, so closing its tab discards it rather than leaving it in the thread list.
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (document && isEmptyDraft(document) && !runtime(id).busy) { store.discardDraft(id); return; }
      save(closeThreadDocument(state.layout, id));
    },
    discardDraft(id) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (!document || document.target.kind !== "draft") return;
      if (document.pending || runtime(id).busy) { setRuntime(id, { error: "Confirm delivery before discarding this instruction." }); return; }
      save({ ...closeThreadDocument(state.layout, id), documents: state.layout.documents.filter((entry) => entry.id !== id) });
    },
    addAttachments(id, attachments) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (!document || document.pending || runtime(id).busy) return;
      const combined = [...(document.attachments ?? []), ...attachments];
      if (combined.length > COMPOSER_ATTACHMENT_MAX_COUNT) {
        setRuntime(id, { error: `Attach up to ${COMPOSER_ATTACHMENT_MAX_COUNT} files per instruction.` }); return;
      }
      save({ ...state.layout, documents: state.layout.documents.map((entry) => entry.id === id
        ? { ...entry, attachments: combined, updatedAt: deps.now() } : entry) });
    },
    removeAttachment(id, attachmentId) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (!document || document.pending || runtime(id).busy) return;
      save({ ...state.layout, documents: state.layout.documents.map((entry) => entry.id === id
        ? { ...entry, attachments: entry.attachments?.filter((file) => file.id !== attachmentId), updatedAt: deps.now() } : entry) });
    },
    setText(id, text) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (!document || document.pending || document.text === text) return;
      if (text.length > 2_000_000) { setRuntime(id, { error: "This draft exceeds the text limit." }); return; }
      save({ ...state.layout, documents: state.layout.documents.map((entry) => entry.id === id ? { ...entry, text, updatedAt: deps.now() } : entry) });
    },
    setBinding(id, binding, origin) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (!document) return;
      const ready = runtime(id).readyBinding;
      if (ready !== binding && !(ready && binding && sameProviderBinding(ready, binding))) setRuntime(id, { readyBinding: binding });
      if (binding && origin === "chosen" && !document.pending && !runtime(id).busy && (!document.provider || !sameProviderBinding(binding, document.provider))) {
        save({ ...state.layout, documents: state.layout.documents.map((entry) => entry.id === id ? { ...entry, provider: binding } : entry) });
      }
    },
    selectWorkspace(id, workspaceId) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      const workspace = state.boot.workspaces.find((entry) => entry.id === workspaceId);
      if (!workspace || !document || document.target.kind !== "draft" || document.pending || runtime(id).busy) return;
      if (document.group || document.direct) { setRuntime(id, { error: "A chat chooses where its bots work, not the workspace it was started from." }); return; }
      const role = effectiveRole(state.boot.personalization, workspaceId);
      if (!role) { setRuntime(id, { error: "Choose a workspace role before sending." }); return; }
      setRuntime(id, { readyBinding: null });
      // A checkout belongs to one workspace, so switching workspace returns the draft to the new one's primary checkout.
      save({ ...state.layout, focusedWorkspaceId: workspaceId, documents: state.layout.documents.map((entry) => {
        if (entry.id !== id) return entry;
        const { checkoutId: _previousCheckout, ...rest } = entry;
        return { ...rest, workspaceId, role };
      }) });
    },
    selectCheckout(id, checkoutId) {
      const document = state.layout.documents.find((entry) => entry.id === id);
      const workspace = document && state.boot.workspaces.find((entry) => entry.id === document.workspaceId);
      if (!document || !workspace || document.target.kind !== "draft" || document.pending || runtime(id).busy) return;
      if (checkoutId && !workspace.checkouts?.some((entry) => entry.checkoutId === checkoutId)) { setRuntime(id, { error: "That checkout is no longer available." }); return; }
      if ((document.checkoutId ?? null) === checkoutId) return;
      setRuntime(id, { readyBinding: null, error: null });
      save({ ...state.layout, documents: state.layout.documents.map((entry) => {
        if (entry.id !== id) return entry;
        const { checkoutId: _previousCheckout, ...rest } = entry;
        return checkoutId ? { ...rest, checkoutId } : rest;
      }) });
    },
    setPinned(conversationId, pinned) {
      const pins = state.layout.pinnedThreadIds;
      if (pins.includes(conversationId) === pinned) return;
      save({ ...state.layout, pinnedThreadIds: pinned ? [...pins, conversationId] : pins.filter((id) => id !== conversationId) });
    },
    togglePin(conversationId) { store.setPinned(conversationId, !state.layout.pinnedThreadIds.includes(conversationId)); },
    ...createThreadReferences(internal),
    ...submission
  };
  return store;
}

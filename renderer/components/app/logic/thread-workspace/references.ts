import { THREAD_REFERENCE_LIMIT } from "@shared/conversations/references";
import type { ThreadWorkspaceInternals } from "@/components/app/types/thread-workspace/internals.types";
import type { ThreadWorkspaceStore } from "@/components/app/types/thread-workspace/state.types";

export function createThreadReferences(internal: ThreadWorkspaceInternals): Pick<ThreadWorkspaceStore, "addThreadReference" | "removeThreadReference"> {
  return {
    async addThreadReference(id, conversationId) {
      const document = internal.snapshot().layout.documents.find((entry) => entry.id === id);
      if (!document || document.pending || internal.runtime(id).busy) return;
      if (document.target.kind === "thread" && document.target.conversationId === conversationId) return;
      if (document.threadReferences?.some((reference) => reference.conversationId === conversationId)) return;
      if ((document.threadReferences?.length ?? 0) >= THREAD_REFERENCE_LIMIT) {
        internal.setRuntime(id, { error: `Attach up to ${THREAD_REFERENCE_LIMIT} chats per instruction.` }); return;
      }
      internal.setRuntime(id, { busy: true, error: null });
      try {
        const reference = await internal.deps.client.reference(conversationId);
        const state = internal.snapshot();
        const latest = state.layout.documents.find((entry) => entry.id === id);
        if (!latest || latest.pending) return;
        if (reference.environmentId !== state.boot.environmentId || reference.conversationId !== conversationId) throw new Error("The referenced chat does not belong to this execution host.");
        internal.save({ ...state.layout, documents: state.layout.documents.map((entry) => entry.id === id
          ? { ...entry, threadReferences: [...(entry.threadReferences ?? []), reference], updatedAt: internal.deps.now() } : entry) });
      } catch (cause) { internal.setRuntime(id, { error: cause instanceof Error ? cause.message : "This chat could not be attached." }); }
      finally { internal.setRuntime(id, { busy: false }); }
    },
    removeThreadReference(id, referenceId) {
      const state = internal.snapshot();
      const document = state.layout.documents.find((entry) => entry.id === id);
      if (!document || document.pending || internal.runtime(id).busy) return;
      internal.save({ ...state.layout, documents: state.layout.documents.map((entry) => entry.id === id
        ? { ...entry, threadReferences: entry.threadReferences?.filter((reference) => reference.id !== referenceId), updatedAt: internal.deps.now() } : entry) });
    }
  };
}

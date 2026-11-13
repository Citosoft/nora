import { buildComposerInstruction } from "@/components/app/logic/composerAttachments";
import { applyThreadSettlement } from "./settlement";
import type { ThreadWorkspaceInternals } from "@/components/app/types/thread-workspace/internals.types";
import type { ThreadWorkspaceStore } from "@/components/app/types/thread-workspace/state.types";
import { createDraftIntent, deliverDraftIntent } from "@/components/app/logic/nativeDraftIntent";
import { compactContextCommand } from "@/components/app/logic/contextUsage";
import { ConversationAccessError } from "@shared/conversations/errors";

/** Persist exact command identities before IPC, retaining them after uncertain or lost replies. */
export function createThreadSubmission(internal: ThreadWorkspaceInternals): Pick<ThreadWorkspaceStore, "submit" | "execute" | "compact"> {
  const { deps } = internal;
  return {
    async submit(id) {
      const state = internal.snapshot();
      const document = state.layout.documents.find((entry) => entry.id === id);
      const runtime = internal.runtime(id);
      if (!document || runtime.busy) return;
      internal.setRuntime(id, { busy: true, error: null });
      try {
        const workspace = state.boot.workspaces.find((entry) => entry.id === document.workspaceId);
        if (!workspace || workspace.workspace.environmentId !== state.boot.environmentId) throw new Error("The owning workspace is unavailable. Your draft has been retained.");
        const binding = runtime.readyBinding;
        let intent = document.pending;
        if (!intent) {
          if (!binding || (!document.text.trim() && !document.attachments?.length && !document.threadReferences?.length)) throw new Error("Choose a ready model and enter an instruction before sending.");
          const target = document.target;
          const currentProvider = target.kind === "thread" ? state.summaries.find((entry) => entry.conversation.id === target.conversationId)?.conversation.provider : undefined;
          if (document.target.kind === "thread" && !currentProvider) throw new Error("Reload this chat before sending. Its provider could not be confirmed.");
          intent = createDraftIntent({ conversationId: document.target.kind === "thread" ? document.target.conversationId : null, currentProvider,
            source: document.source, workspace, provider: binding, role: document.role, botId: document.botId ?? null, ...(document.group ? { group: document.group } : {}), text: buildComposerInstruction(document.text, document.attachments, document.threadReferences) }, deps.nextId);
        }
        if (!internal.save({ ...state.layout, documents: state.layout.documents.map((entry) => entry.id === id ? { ...entry, pending: intent } : entry) })) return;
        const conversationId = await deliverDraftIntent(deps.client, intent);
        const latest = internal.snapshot();
        internal.save({ ...latest.layout, documents: latest.layout.documents.map((entry) => entry.id === id
          ? { ...entry, target: { kind: "thread", conversationId }, text: "", attachments: [], threadReferences: [], pending: null, updatedAt: deps.now() } : entry) });
        internal.refresh();
      } catch (cause) {
        // These typed rejections guarantee no transition was admitted. Keep the editable draft; uncertain delivery keeps its identity.
        if (cause instanceof ConversationAccessError && ["invalid", "conflict", "missing", "environment"].includes(cause.code)) {
          const latest = internal.snapshot();
          if (latest.layout.documents.find((entry) => entry.id === id)?.pending?.submit.providerChange) {
            internal.save({ ...latest.layout, documents: latest.layout.documents.map((entry) => entry.id === id ? { ...entry, pending: null } : entry) });
            internal.refresh();
          }
        }
        internal.setRuntime(id, { error: cause instanceof Error ? cause.message : "Delivery was not confirmed. Retry checks the saved instruction identity." });
      }
      finally { internal.setRuntime(id, { busy: false }); }
    },
    /** Queues a context compaction run; it carries no draft text, so it bypasses the saved-instruction flow. */
    async compact(id) {
      const document = internal.snapshot().layout.documents.find((entry) => entry.id === id);
      if (!document || document.target.kind !== "thread" || document.pending || internal.runtime(id).busy) return;
      internal.setRuntime(id, { busy: true, error: null });
      try { await deps.client.execute(compactContextCommand(document.target.conversationId, deps.nextId)); internal.refresh(); }
      catch (cause) { internal.setRuntime(id, { error: cause instanceof Error ? cause.message : "Context compaction could not be requested." }); }
      finally { internal.setRuntime(id, { busy: false }); }
    },
    async execute(id, command) {
      const document = internal.snapshot().layout.documents.find((entry) => entry.id === id);
      if (!document || document.target.kind !== "thread" || document.target.conversationId !== command.conversationId || command.kind === "create" || command.kind === "submit" || internal.runtime(id).busy) return;
      internal.setRuntime(id, { busy: true, error: null });
      try {
        if (command.kind === "archive" || command.kind === "unarchive") await applyThreadSettlement(internal, command);
        else { await deps.client.execute(command); internal.refresh(); }
      }
      catch (cause) { internal.setRuntime(id, { error: cause instanceof Error ? cause.message : "The thread command could not be delivered." }); }
      finally { internal.setRuntime(id, { busy: false }); }
    }
  };
}

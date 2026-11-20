import { inboxChannel, inboxReplySchema, inboxRequestSchema } from "@shared/inbox/gateway";
import type { InboxIpcDeps } from "@main/types/inbox/inbox.types";

/** The window reads the inbox and changes its marks here; the inbox itself is built in main. */
export function registerInboxIpc(deps: InboxIpcDeps): () => void {
  deps.ipc.handle(inboxChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot access the inbox" };
    const parsed = inboxRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "This inbox request is not valid" };
    try {
      const snapshot = parsed.data.kind === "list" ? deps.inbox.snapshot() : deps.inbox.execute(parsed.data.command);
      return inboxReplySchema.parse({ ok: true, snapshot });
    } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "The inbox could not be updated" }; }
  });
  return () => { deps.ipc.removeHandler(inboxChannel); };
}

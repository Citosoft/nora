import { chatBranchNameChannel, chatBranchNameReplySchema, chatBranchNameRequestSchema, chatBranchReplySchema, chatBranchRequestSchema, chatBranchesChannel } from "@shared/bots/branches/gateway";
import type { ChatBranchIpcDeps } from "@main/types/bots/chats.types";

/** The window starts and names side chats off bot and group chats here; main resolves the bot, its workspace and its model. */
export function registerChatBranchIpc(deps: ChatBranchIpcDeps): () => void {
  deps.ipc.handle(chatBranchesChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot start chat branches" };
    const parsed = chatBranchRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "This branch is not valid" };
    try { return chatBranchReplySchema.parse({ ok: true, conversationId: await deps.start(parsed.data) }); }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "The branch could not be started" }; }
  });
  deps.ipc.handle(chatBranchNameChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot name chat branches" };
    const parsed = chatBranchNameRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "There is nothing to name this branch from" };
    try { return chatBranchNameReplySchema.parse({ ok: true, title: await deps.name(parsed.data.message) }); }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "The branch could not be named" }; }
  });
  return () => { deps.ipc.removeHandler(chatBranchesChannel); deps.ipc.removeHandler(chatBranchNameChannel); };
}

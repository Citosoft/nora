import { directContextChannel, directContextReplySchema, directContextRequestSchema } from "@shared/bots/direct/contextGateway";
import type { DirectContextIpcDeps } from "@main/types/bots/chats.types";

/** The window's developer view of a direct chat reads what its next message would send here; it never runs anything. */
export function registerDirectContextIpc(deps: DirectContextIpcDeps): () => void {
  deps.ipc.handle(directContextChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot inspect chat context" };
    const parsed = directContextRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "This preview request is not valid" };
    try { return directContextReplySchema.parse({ ok: true, preview: deps.preview(parsed.data) }); }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "The context could not be previewed" }; }
  });
  return () => { deps.ipc.removeHandler(directContextChannel); };
}

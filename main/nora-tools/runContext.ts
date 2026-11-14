import type { Conversation } from "@shared/types/conversation/contracts.types";
import { memoryOwnerOf } from "@main/bots/memory/owner";
import { createMemoryDelivery } from "@main/bots/memory/delivery";
import type { BotMemoryStore } from "@main/types/bots/memory.types";
import type { NoraRunContextResolver, NoraToolServer } from "@main/types/nora-tools/noraTools.types";

const MEMORY_DIGEST_CHARS = 4000;
const NORA_GUIDANCE = "You are Nora, the user's assistant inside the Nora app. Nora's own tools (server \"nora\") manage the app: "
  + "bots, workspaces, threads and the task board. When the user @mentions a bot by name, pass the request to that bot with ask_bot "
  + "and relay its answer.";
const BOT_TOOLS_GUIDANCE = "You can ask other bots for help with ask_bot (find them with list_bots).";
/** Each thread starts without the others' history, so continuity depends on saving what matters and looking back when work continues. */
const CONTINUITY_GUIDANCE = "Each thread starts fresh; only your notes carry over. When the user states a preference, a decision is made or you learn "
  + "a lasting fact about their work, save it with remember before you finish, as one short self-contained note (never secrets). "
  + "Correct or merge a note you saved by passing its id (shown in brackets) as memory_id, and forget notes that turn out wrong, rather than adding near-duplicates. "
  + "When a request continues earlier work, search your notes with recall or find the earlier thread with list_threads and read_thread.";

/**
 * Per-run additions kept out of the frozen conversation snapshot: the tool endpoint, guidance and saved notes. Notes are frozen
 * per thread in the guidance and later changes ride with the turn (see createMemoryDelivery), so the guidance stays cacheable.
 */
export function createRunContextResolver(server: NoraToolServer, memory: BotMemoryStore): NoraRunContextResolver {
  const delivery = createMemoryDelivery();
  return async (conversation: Conversation) => {
    if (conversation.group || conversation.direct) return { tools: null, guidance: null, turnNotes: null };
    const tools = await server.resolve(conversation).catch((error: unknown) => {
      console.error("Nora tools are unavailable for this turn", error); return null;
    });
    const notes = delivery.forRun(conversation.id, memory.digest(memoryOwnerOf(conversation), conversation.workspace.projectId, MEMORY_DIGEST_CHARS));
    const toolGuidance = tools ? [conversation.bot ? BOT_TOOLS_GUIDANCE : NORA_GUIDANCE, CONTINUITY_GUIDANCE] : [];
    return { tools, guidance: [...toolGuidance, notes.guidance].filter(Boolean).join("\n\n") || null, turnNotes: notes.turnNotes };
  };
}

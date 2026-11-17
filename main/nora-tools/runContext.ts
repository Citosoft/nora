import { memoryOwnerOf } from "@main/bots/memory/owner";
import { createMemoryDelivery } from "@main/bots/memory/delivery";
import type { BotMemoryStore } from "@main/types/bots/memory.types";
import { joinGuidance } from "@main/nora-tools/endpoint";
import { connectorSubjectOf } from "@shared/connectors/access";
import type { NoraRunContextSource, NoraToolServer, RunContextConnectors, RunContextSubject } from "@main/types/nora-tools/noraTools.types";

const MEMORY_DIGEST_CHARS = 4000;
const NORA_GUIDANCE = "You are Nora, the user's assistant inside the Nora app. Nora's own tools (server \"nora\") manage the app: "
  + "bots, workspaces, threads, the task board and workflows. When the user @mentions a bot by name, pass the request to that bot with ask_bot "
  + "and relay its answer.";
const BOT_TOOLS_GUIDANCE = "You can ask other bots for help with ask_bot (find them with list_bots).";
/** Each thread starts without the others' history, so continuity depends on saving what matters and looking back when work continues. */
const CONTINUITY_GUIDANCE = "Each thread starts fresh; only your notes carry over. When the user states a preference, a decision is made or you learn "
  + "a lasting fact about their work, save it with remember before you finish, as one short self-contained note (never secrets). "
  + "Correct or merge a note you saved by passing its id (shown in brackets) as memory_id, and forget notes that turn out wrong, rather than adding near-duplicates. "
  + "When a request continues earlier work, search your notes with recall or find the earlier thread with list_threads and read_thread.";

/** Tool guidance for a thread that has Nora's tools: Nora's own, or a bot's, plus how continuity works. */
function toolGuidance(conversation: RunContextSubject): string {
  if (conversation.source?.kind === "workflow" && conversation.workspace.access === "read") {
    return "This is a read-only workflow review. Inspect using read-only tools, then call report_workflow_stage with your outcome and summary. App changes, memory writes and delegation tools are unavailable in review stages.";
  }
  return [conversation.bot ? BOT_TOOLS_GUIDANCE : NORA_GUIDANCE, CONTINUITY_GUIDANCE].join("\n\n");
}
/** Coordinator chats (group and direct) run on Nora itself and get no per-run additions. */
const coordinated = (conversation: RunContextSubject): boolean => !!conversation.group || !!conversation.direct;

/**
 * Per-run additions kept out of the frozen conversation snapshot: the tool endpoint, connectors, guidance and saved notes. Notes are frozen
 * per thread in the guidance and later changes ride with the turn (see createMemoryDelivery), so the guidance stays cacheable.
 * `preview` describes the next run's additions without resolving an endpoint or freezing notes, for the context inspector.
 */
export function createRunContext(server: NoraToolServer, memory: BotMemoryStore, connectors: RunContextConnectors): NoraRunContextSource {
  const delivery = createMemoryDelivery();
  const digest = (conversation: RunContextSubject) => memory.digest(memoryOwnerOf(conversation), conversation.workspace.projectId, MEMORY_DIGEST_CHARS);
  return {
    async resolve(conversation) {
      if (coordinated(conversation)) return { tools: null, connectors: [], guidance: null, turnNotes: null };
      const [tools, endpoints] = await Promise.all([
        server.resolve(conversation).catch((error: unknown) => { console.error("Nora tools are unavailable for this turn", error); return null; }),
        connectors.endpoints(connectorSubjectOf(conversation)).catch((error: unknown) => { console.error("Connectors are unavailable for this turn", error); return []; })
      ]);
      const notes = delivery.forRun(conversation.id, digest(conversation));
      return { tools, connectors: endpoints, guidance: joinGuidance(tools ? toolGuidance(conversation) : null, notes.guidance) ?? null, turnNotes: notes.turnNotes };
    },
    preview(conversation) {
      if (coordinated(conversation)) return { tools: false, connectors: 0, toolGuidance: null, notesGuidance: null, turnNotes: null };
      const tools = server.running();
      const notes = delivery.peek(conversation.id, digest(conversation));
      return { tools, connectors: connectors.activeCount(connectorSubjectOf(conversation)), toolGuidance: tools ? toolGuidance(conversation) : null, notesGuidance: notes.guidance, turnNotes: notes.turnNotes };
    }
  };
}

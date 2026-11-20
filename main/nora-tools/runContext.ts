import { memoryOwnerOf } from "@main/bots/memory/owner";
import { createMemoryDelivery } from "@main/bots/memory/delivery";
import type { BotMemoryStore } from "@main/types/bots/memory.types";
import { joinGuidance } from "@main/nora-tools/endpoint";
import { connectorSubjectOf } from "@shared/connectors/access";
import type { NoraRunContextSource, NoraToolServer, RunContextConnectors, RunContextSubject } from "@main/types/nora-tools/noraTools.types";
import { appBuilderGuide } from "@main/apps/builderGuide";

const MEMORY_DIGEST_CHARS = 4000;
const NORA_GUIDANCE = "You are Nora, the user's assistant inside the Nora app. Nora's own tools (server \"nora\") manage the app: "
  + "bots, workspaces, threads, the task board and workflows. When the user @mentions a bot by name, pass the request to that bot with ask_bot "
  + "and relay its answer. For a job with separable parts, orchestrate: give each part to a worker thread with start_thread (a self-contained brief, "
  + "with the model that suits it from list_models, or a bot that fits), keep the parts apart so workers do not edit the same files, collect their reports "
  + "with wait_for_threads, follow up with message_thread where one falls short, then check and combine the results for the user.";
/** A worker's first message is its brief and its final message is what the thread that started it reads. */
const WORKER_GUIDANCE = "You are a worker thread that another thread started to do one part of a larger job; your first message is your brief, and that thread reads your "
  + "final message as your report. Do the part in full and stay within it, then end with a concise report: what you did, the files you changed, "
  + "and anything left undone or uncertain.";
const BOT_TOOLS_GUIDANCE = "You can ask other bots for help with ask_bot (find them with list_bots).";
const BOT_WORK_GUIDANCE = "Start separate tasks with start_thread: give each a self-contained brief; by default it runs as you. "
  + "Keep independent work in separate threads and avoid concurrent edits to the same files. Track your work with list_threads and read_thread, "
  + "follow up with message_thread, and collect results with wait_for_threads. Tell the user what you started and link its thread. "
  + "You can follow up on workers you started in earlier threads too.";
/** Each thread starts without the others' history, so continuity depends on saving what matters and looking back when work continues. */
const CONTINUITY_GUIDANCE = "Each thread starts fresh; only your notes carry over. When the user states a preference, a decision is made or you learn "
  + "a lasting fact about their work, save it with remember before you finish, as one short self-contained note (never secrets). "
  + "Correct or merge a note you saved by passing its id (shown in brackets) as memory_id, and forget notes that turn out wrong, rather than adding near-duplicates. "
  + "When a request continues earlier work, search your notes with recall or find the earlier thread with list_threads and read_thread.";

/** Secrets pasted into chat end up in provider logs, so threads are steered to the dialog that keeps them out of the transcript. */
const SECRETS_GUIDANCE = "Never ask the user to paste a password, API key, token or other secret into chat, and never repeat one they did paste. "
  + "Ask for it with request_secret, which opens a secure dialog and stores the value in the system keychain without showing it to you, "
  + "then use it by name with run_with_secrets. Check list_secrets before asking for one that may already be saved.";

const APP_BUILDER_GUIDANCE = "This thread builds one app for the user. Their first message describes it: discover and sample the connectors it needs, then call create_app. "
  + "Later messages ask for changes to that app: read_app, change only what was asked, then update_app. Keep replies short; the app itself is on screen beside this chat.";
/** A thread opened from an app that already exists only ever changes it, so create_app is off the table from the first message. */
const appBuilderGuidance = (appId: string | null): string => appId
  ? `This thread changes the user's existing app (id ${appId}), which is on screen beside this chat. Every message asks for a change to it: read_app, change only what was asked, then update_app with that id. Never call create_app here. Keep replies short.`
  : APP_BUILDER_GUIDANCE;

/** Tool guidance for a thread that has Nora's tools: Nora's own, or a bot's, plus how continuity works. */
function toolGuidance(conversation: RunContextSubject): string {
  if (conversation.source?.kind === "workflow" && conversation.workspace.access === "read") {
    return "This is a read-only workflow review. Inspect using read-only tools, then call report_workflow_stage with your outcome and summary. App changes, memory writes and delegation tools are unavailable in review stages.";
  }
  // An app's builder has only the app tools and its connectors, so it carries the full guide (stable across turns) and none of the guidance about tools it lacks.
  if (conversation.source?.kind === "app") return [appBuilderGuidance(conversation.source.appId), SECRETS_GUIDANCE, appBuilderGuide()].join("\n\n");
  const worker = conversation.source?.kind === "worker";
  const workerAccess = worker && conversation.workspace.access === "read"
    ? "You have read-only access. You may inspect files and run commands that do not change the checkout, including read-only checks and waits. "
      + "Commands run in a read-only sandbox; do not disable or escape it. Commands that need to write into the checkout require a write worker instead."
    : null;
  return [workerAccess, ...(worker ? [WORKER_GUIDANCE] : []), conversation.bot ? BOT_TOOLS_GUIDANCE : worker ? null : NORA_GUIDANCE, conversation.bot && !worker ? BOT_WORK_GUIDANCE : null, CONTINUITY_GUIDANCE, SECRETS_GUIDANCE]
    .filter((part): part is string => !!part).join("\n\n");
}
/** An app's builder thread is handed only the connectors chosen for the app; every other thread gets all it may use. */
export const connectorsChosenBy = (conversation: RunContextSubject): readonly string[] | undefined =>
  conversation.source?.kind === "app" ? conversation.source.connectorIds : undefined;
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
        connectors.endpoints(connectorSubjectOf(conversation), connectorsChosenBy(conversation)).catch((error: unknown) => { console.error("Connectors are unavailable for this turn", error); return []; })
      ]);
      const notes = delivery.forRun(conversation.id, digest(conversation));
      return { tools, connectors: endpoints, guidance: joinGuidance(tools ? toolGuidance(conversation) : null, notes.guidance) ?? null, turnNotes: notes.turnNotes };
    },
    preview(conversation) {
      if (coordinated(conversation)) return { tools: false, connectors: 0, toolGuidance: null, notesGuidance: null, turnNotes: null };
      const tools = server.running();
      const notes = delivery.peek(conversation.id, digest(conversation));
      return { tools, connectors: connectors.activeCount(connectorSubjectOf(conversation), connectorsChosenBy(conversation)), toolGuidance: tools ? toolGuidance(conversation) : null, notesGuidance: notes.guidance, turnNotes: notes.turnNotes };
    }
  };
}

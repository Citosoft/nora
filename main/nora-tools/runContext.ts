import { memoryOwnerOf } from "@main/bots/memory/owner";
import { createMemoryDelivery } from "@main/bots/memory/delivery";
import type { BotMemoryStore } from "@main/types/bots/memory.types";
import { joinGuidance } from "@main/nora-tools/endpoint";
import { connectorSubjectOf } from "@shared/connectors/access";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { NoraRunContextSource, NoraToolServer, RunContextAccountConnectors, RunContextConnectors, RunContextParentLookup, RunContextSubject } from "@main/types/nora-tools/noraTools.types";
import { appBuilderGuide, guidanceCarriesAppBuilderGuide } from "@main/apps/builderGuide";

const MEMORY_DIGEST_CHARS = 4000;
/** Bounds the walk up a thread's parents for authorize cards; ask chains are far shallower than this. */
const ANCESTORS_MAX = 8;
const NORA_GUIDANCE = "You are Nora, the user's assistant inside the Nora app. Nora's own tools (server \"nora\") manage the app: "
  + "bots, workspaces, threads, the task board and workflows. When the user @mentions a bot by name, pass the request to that bot with ask_bot "
  + "(wait=notify by default so you can keep going; Nora posts its answer here when it finishes; wait=reply only when you need the answer this turn). "
  + "For a job with separable parts, orchestrate: give each part to a worker thread with start_thread (a self-contained brief, "
  + "with the model that suits it from list_models, or a bot that fits), keep the parts apart so workers do not edit the same files, collect their reports "
  + "with wait_for_threads, follow up with message_thread where one falls short, then check and combine the results for the user.";
/** A worker's first message is its brief and its final message is what the thread that started it reads. */
const WORKER_GUIDANCE = "You are a worker thread that another thread started to do one part of a larger job; your first message is your brief, and that thread reads your "
  + "final message as your report. Do the part in full and stay within it, then end with a concise report: what you did, the files you changed, "
  + "and anything left undone or uncertain.";
const BOT_TOOLS_GUIDANCE = "Ask other bots with ask_bot (list_bots); wait=notify (default) keeps you moving, wait=reply when you need the answer first.";
const BOT_WORK_GUIDANCE = "Delegate with start_thread (self-contained brief; default runs as you), keep file edits apart, "
  + "then wait_for_threads / message_thread / read_thread. Tell the user what you started and link its thread.";
/** Each thread starts without the others' history, so continuity depends on saving what matters and looking back when work continues. */
const CONTINUITY_GUIDANCE = "Threads start fresh; lasting facts go in remember (short notes, never secrets; merge via memory_id). "
  + "For earlier work use recall, list_threads / read_thread, or chat_history when answering in a chat.";

/** Secrets pasted into chat end up in provider logs, so threads are steered to the dialog that keeps them out of the transcript. */
const SECRETS_GUIDANCE = "Never ask for secrets in chat. Use request_secret, then run_with_secrets; check list_secrets first.";

/** The thread's own create_app or update_app already holds the current spec, so read_app is only for a spec the thread has not seen. */
const APP_CHANGE_GUIDANCE = "Change only what was asked, then save with update_app, passing the version you last saw as base_version. "
  + "Call read_app only when this thread has not seen the app's current spec, or update_app says the app changed.";
const APP_BUILDER_GUIDANCE = "This thread builds one app for the user. Their first message describes it: discover and sample the connectors it needs, then call create_app. "
  + `Later messages ask for changes to that app. ${APP_CHANGE_GUIDANCE} Keep replies short; the app itself is on screen beside this chat.`;
/** A thread opened from an app that already exists only ever changes it, so create_app is off the table from the first message. */
const appBuilderGuidance = (appId: string | null): string => appId
  ? `This thread changes the user's existing app (id ${appId}), which is on screen beside this chat. Every message asks for a change to it, made with update_app and that id. ${APP_CHANGE_GUIDANCE} Never call create_app here. Keep replies short.`
  : APP_BUILDER_GUIDANCE;

/** Tool guidance for a thread that has Nora's tools: Nora's own, or a bot's, plus how continuity works. */
function toolGuidance(conversation: RunContextSubject): string {
  if (conversation.source?.kind === "workflow" && conversation.workspace.access === "read") {
    return "This is a read-only workflow review. Inspect using read-only tools, then call report_workflow_stage with your outcome and summary. App changes, memory writes and delegation tools are unavailable in review stages.";
  }
  // An app's builder has only the app tools and its connectors, so it carries the full guide (stable across turns) and none of the guidance about tools it lacks.
  if (guidanceCarriesAppBuilderGuide(conversation)) return [appBuilderGuidance(conversation.source.appId), SECRETS_GUIDANCE, appBuilderGuide()].join("\n\n");
  const worker = conversation.source?.kind === "worker";
  const workerAccess = worker && conversation.workspace.access === "read"
    ? "You have read-only access. You may inspect files and run commands that do not change the checkout, including read-only checks and waits. "
      + "Commands run in a read-only sandbox; do not disable or escape it. Commands that need to write into the checkout require a write worker instead."
    : null;
  return [workerAccess, ...(worker ? [WORKER_GUIDANCE] : []), conversation.bot ? BOT_TOOLS_GUIDANCE : worker ? null : NORA_GUIDANCE, conversation.bot && !worker ? BOT_WORK_GUIDANCE : null, CONTINUITY_GUIDANCE, SECRETS_GUIDANCE]
    .filter((part): part is string => !!part).join("\n\n");
}
/**
 * App builders get only the connectors chosen for the app. Plain workers (no bot) get none — each connector's tool catalogue
 * is expensive and workers should inherit tools from a bot that opted in, or use none. Bot threads rely on `connectorIdsForBot`
 * (undefined here). Nora's own working threads keep every usable connector.
 */
export const connectorsChosenBy = (conversation: RunContextSubject): readonly string[] | undefined => {
  if (conversation.source?.kind === "app") return conversation.source.connectorIds;
  if (conversation.source?.kind === "worker" && !conversation.bot) return [];
  return undefined;
};
/** Coordinator chats (group and direct) run on Nora itself and get no per-run additions. */
const coordinated = (conversation: RunContextSubject): boolean => !!conversation.group || !!conversation.direct;

/** Asking thread first, then parents, so a chat can show a bot worker's connector authorize card. */
export const conversationIdsFor = (conversation: Pick<Conversation, "id" | "parentId">, parentOf?: RunContextParentLookup): readonly string[] => {
  const ids = [conversation.id];
  for (let parentId = conversation.parentId; parentId && ids.length <= ANCESTORS_MAX && !ids.includes(parentId);
    parentId = parentOf?.(parentId) ?? null) ids.push(parentId);
  return ids;
};

/**
 * Per-run additions kept out of the frozen conversation snapshot: the tool endpoint, connectors, guidance and saved notes. Notes are frozen
 * per thread in the guidance and later changes ride with the turn (see createMemoryDelivery), so the guidance stays cacheable.
 * `preview` describes the next run's additions without resolving an endpoint or freezing notes, for the context inspector.
 */
export function createRunContext(server: NoraToolServer, memory: BotMemoryStore, connectors: RunContextConnectors,
  accountConnectors: RunContextAccountConnectors = () => [], parentOf?: RunContextParentLookup): NoraRunContextSource {
  const delivery = createMemoryDelivery();
  const digest = (conversation: RunContextSubject) => memory.digest(memoryOwnerOf(conversation), conversation.workspace.projectId, MEMORY_DIGEST_CHARS);
  return {
    async resolve(conversation) {
      if (coordinated(conversation)) return { tools: null, connectors: [], guidance: null, turnNotes: null };
      const [tools, endpoints] = await Promise.all([
        server.resolve(conversation).catch((error: unknown) => { console.error("Nora tools are unavailable for this turn", error); return null; }),
        connectors.endpoints(connectorSubjectOf(conversation), connectorsChosenBy(conversation), conversationIdsFor(conversation, parentOf))
          .catch((error: unknown) => { console.error("Connectors are unavailable for this turn", error); return []; })
      ]);
      const notes = delivery.forRun(conversation.id, digest(conversation));
      return { tools, connectors: endpoints, accountConnectors: accountConnectors(connectorSubjectOf(conversation)),
        guidance: joinGuidance(tools ? toolGuidance(conversation) : null, notes.guidance) ?? null, turnNotes: notes.turnNotes };
    },
    preview(conversation) {
      if (coordinated(conversation)) return { tools: false, connectors: 0, toolGuidance: null, notesGuidance: null, turnNotes: null };
      const tools = server.running();
      const notes = delivery.peek(conversation.id, digest(conversation));
      return { tools, connectors: connectors.activeCount(connectorSubjectOf(conversation), connectorsChosenBy(conversation)), toolGuidance: tools ? toolGuidance(conversation) : null, notesGuidance: notes.guidance, turnNotes: notes.turnNotes };
    }
  };
}

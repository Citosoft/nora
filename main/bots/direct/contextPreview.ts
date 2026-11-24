import { snapshotBot } from "@shared/bots/snapshot";
import { chatBotFor, isNoraChat } from "@shared/bots/noraChat";
import { questionGuidance, questionToolOf } from "@main/execution/questionGuidance";
import { directPrompt } from "./prompt";
import { directRouterPrompt, directRouterRecent } from "./router";
import { resolveDirectRoute } from "./routing";
import { directPlacement, openDirectThreads } from "./workspaces";
import type { DirectDescriptor } from "@shared/types/bots/bots.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { DirectContextModelRequest, DirectContextPreview, DirectContextRequest, DirectContextSection, DirectContextTarget,
  DirectContextTargetOption } from "@shared/ipc/types/directContextGateway.types";
import type { ChatWorkspace, DirectContextPreviewDeps, DirectPreviewThread, DirectRoute, DirectWorkThread } from "@main/types/bots/chats.types";

const DRAFT_PLACEHOLDER = "(your next message)";
/** Never a real conversation id, so the memory preview treats it as a thread that has not frozen its notes yet. */
const NEW_THREAD_ID = "context-preview:new-thread";

function chatItems(deps: DirectContextPreviewDeps, chatId: string): TimelineItem[] {
  const page = deps.host.conversationHistory({ conversationId: chatId, scope: "timeline", limit: 200 });
  return page.scope === "timeline" ? page.items : [];
}

function targetOf(route: DirectRoute): DirectContextTarget {
  return route.kind === "continue" ? { kind: "continue", threadId: route.threadId } : { kind: "new", workspaceId: route.workspaceId };
}

function targetOptions(threads: readonly DirectWorkThread[], workspaces: readonly ChatWorkspace[]): DirectContextTargetOption[] {
  return [...[...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((thread): DirectContextTargetOption => ({ target: { kind: "continue", threadId: thread.id }, label: `Continue “${thread.title}” · ${thread.workspaceName}` })),
  ...workspaces.map((workspace): DirectContextTargetOption => ({ target: { kind: "new", workspaceId: workspace.id }, label: `New task in ${workspace.name}` }))];
}

function sameTarget(a: DirectContextTarget, b: DirectContextTarget): boolean {
  return a.kind === "continue" ? b.kind === "continue" && a.threadId === b.threadId : b.kind === "new" && a.workspaceId === b.workspaceId;
}

function previewThread(deps: DirectContextPreviewDeps, direct: DirectDescriptor, target: DirectContextTarget, workspaces: readonly ChatWorkspace[]): DirectPreviewThread {
  const nora = isNoraChat(direct.botId);
  if (target.kind === "continue") {
    const thread = deps.host.header(target.threadId)?.conversation;
    if (!thread || (!thread.bot && !nora)) throw new Error("That work thread is no longer open.");
    const workspaceName = workspaces.find((entry) => entry.id === thread.workspace.projectId)?.name ?? thread.workspace.projectId;
    return { id: thread.id, workspaceName, bot: thread.bot ?? null, provider: thread.provider, subject: thread, lastRequest: thread.context ?? null };
  }
  const workspace = workspaces.find((entry) => entry.id === target.workspaceId);
  if (workspace && nora) {
    return { id: NEW_THREAD_ID, workspaceName: workspace.name, bot: null, provider: deps.noraModel(), subject: { id: NEW_THREAD_ID, workspace: workspace.workspace }, lastRequest: null };
  }
  const definition = workspace ? deps.bot(workspace.id, direct.botId) : null;
  if (!workspace || !definition) throw new Error(`${direct.name} is not available in that workspace.`);
  const bot = snapshotBot(definition);
  return { id: NEW_THREAD_ID, workspaceName: workspace.name, bot, provider: definition.binding, subject: { id: NEW_THREAD_ID, bot, workspace: workspace.workspace }, lastRequest: null };
}

function section(id: string, label: string, placement: DirectContextSection["placement"], text: string | null, note?: string): DirectContextSection[] {
  return text === null && !note ? [] : [{ id, label, placement, text, ...(note ? { note } : {}) }];
}

/** The work thread's request in the order providers assemble it: system guidance, the session so far, then this turn. */
function workThreadRequest(deps: DirectContextPreviewDeps, direct: DirectDescriptor, thread: DirectPreviewThread, items: readonly TimelineItem[]): DirectContextModelRequest {
  const run = deps.runContext(thread.subject);
  const tool = thread.provider ? questionToolOf(thread.provider.kind) : null;
  const runtime = thread.provider?.kind ?? "The runtime";
  const continuing = thread.id !== NEW_THREAD_ID;
  const sections = [
    ...section("provider-base", "Provider base prompt and tool schemas", "system", null,
      `${runtime} adds its own system prompt${run.tools ? " and the definitions of its tools and Nora's" : " and tool definitions"}; Nora cannot see them, so they are not counted here.`),
    ...(thread.bot ? section("bot", "Bot persona and instructions", "system", thread.bot.guidance) : []),
    ...section("tools", "Nora tool guidance", "system", run.toolGuidance),
    ...section("notes", continuing ? "Saved notes (frozen for this thread)" : "Saved notes", "system", run.notesGuidance),
    ...(tool ? section("runtime", "Runtime guidance (bounded reads, question widgets)", "system", questionGuidance(tool)) : []),
    ...(continuing ? section("history", "Earlier turns in this thread", "history", null,
      "The provider's own session holds them; the last measured request below includes them.") : []),
    ...section("turn-notes", "Saved-note changes (this turn only)", "turn", run.turnNotes),
    ...section("message", continuing ? "Your message, with the chat since the bot last replied" : "Your message, with the chat so far", "turn",
      directPrompt(direct, items, thread.id, thread.workspaceName))
  ];
  return { id: "work-thread", title: continuing ? "Work thread (continuing)" : "Work thread (new)",
    purpose: `${thread.bot?.name ?? direct.name} does the work and writes the reply in ${thread.workspaceName}.${tool ? "" : " Runtimes without a system prompt option receive the system guidance at the start of the first message."}`,
    model: thread.provider ? `${thread.provider.kind} · ${thread.provider.model}` : "The first available provider and model", sections, lastRequest: thread.lastRequest };
}

/**
 * What the next message in a direct chat would send: the routing request, then the work thread's request for the chosen target.
 * Mirrors DirectCoordinator using the same prompt builders, and only reads: no model runs, no thread is created, no notes freeze.
 */
export function previewDirectContext(deps: DirectContextPreviewDeps, request: DirectContextRequest): DirectContextPreview {
  const chat = deps.host.header(request.chatId)?.conversation;
  const direct = chat?.direct;
  if (!chat || !direct) throw new Error("This is not a direct chat.");
  const placement = directPlacement(direct, deps.workspaces(), chatBotFor(deps.bot), null);
  if (!placement) throw new Error(`${direct.name} is not available in any open workspace.`);
  const { workspaces, defaultWorkspaceId } = placement;
  const threads = openDirectThreads(deps.host.summaries(), chat, workspaces);
  const message = request.draft.trim() || DRAFT_PLACEHOLDER;
  // At send time the user's message is already in the chat timeline, so the preview adds the draft the same way.
  const items: TimelineItem[] = [...chatItems(deps, chat.id),
    { kind: "message", id: "context-preview:draft", runId: "context-preview", createdAt: deps.now(), role: "user", text: message, complete: true }];
  const router = directRouterPrompt({ message, bot: direct, recent: directRouterRecent(items), threads, workspaces, defaultWorkspaceId });
  const targets = targetOptions(threads, workspaces);
  const fallback = targetOf(resolveDirectRoute({ route: null, message, threads, workspaces, defaultWorkspaceId }));
  const requested = request.target;
  const chosen = requested && targets.some((option) => sameTarget(option.target, requested)) ? requested : fallback;
  return {
    target: chosen, fallback: sameTarget(chosen, fallback), targets,
    requests: [
      { id: "router", title: "Router", purpose: "Runs first and decides which work thread gets the message; its answer can differ from the target previewed below.",
        model: deps.routerModel(), lastRequest: null, sections: [
          ...section("router-system", "Routing instructions", "system", router.system),
          ...section("router-user", "Open tasks, workspaces, recent chat and your message", "turn", router.user)] },
      workThreadRequest(deps, direct, previewThread(deps, direct, chosen, workspaces), items)
    ]
  };
}

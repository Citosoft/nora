import { NORA_PROVIDER_KIND } from "@shared/providers/providerKinds";
import { DIRECT_BINDING } from "@shared/bots/chats";
import { askBotThread, authorOf, createBotThread } from "@main/bots/conversations/runner";
import { reconcileChatRun, startChatRun } from "@main/bots/chats/chatRun";
import { directPrompt } from "./prompt";
import { resolveDirectRoute } from "./routing";
import { directPlacement, openDirectThreads } from "./workspaces";
import { directRouterRecent } from "./router";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { EmitProviderUpdate, ExecutionProvider, ProviderExecution } from "@main/types/execution/provider.types";
import type { DirectCoordinatorOptions } from "@main/types/bots/chats.types";

const REPLY_TIMEOUT_MS = 15 * 60_000;

/**
 * Runs a bot's direct chat. Each user message becomes one run here: it continues the open task it belongs to or starts a new
 * work thread (in any workspace the bot is available in), waits for the bot there and posts its reply into the chat.
 */
export class DirectCoordinator implements ExecutionProvider {
  readonly kind = NORA_PROVIDER_KIND;
  readonly instanceId = DIRECT_BINDING.instanceId;
  readonly capabilities = { resume: true, interrupt: true, steering: false, approvals: false, questions: false, reasoning: false,
    attachments: false, turnChanges: false, subagentDetails: false };
  private readonly active = new Map<string, AbortController>();
  constructor(private readonly options: DirectCoordinatorOptions) {}

  async catalog(): Promise<ProviderCatalogResult> {
    return { status: "available", catalog: { kind: this.kind, instanceId: this.instanceId, capabilities: this.capabilities, authentication: "present",
      models: [{ id: DIRECT_BINDING.model, name: "Direct chat", description: "The bot answers with its own model.", reasoningEfforts: [], defaultReasoningEffort: null }],
      policies: [{ id: DIRECT_BINDING.permissionPolicy, label: "The bot's own permissions" }] } };
  }

  async start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const conversation = execution.snapshot.conversation;
    const direct = conversation.direct;
    const chat = startChatRun(execution, emit, this.options.now, "direct");
    if (!direct) { chat.finish("failed", "This thread is not a direct chat."); return; }
    const controller = new AbortController();
    this.active.set(execution.run.id, controller);
    try {
      const pinned = execution.run.workspaceId ?? null;
      const placement = directPlacement(direct, this.options.workspaces(), this.options.bot, pinned);
      if (!placement) {
        chat.milestone(pinned ? `${direct.name} is not available in the workspace this message is for.` : `${direct.name} is not available in any open workspace.`);
        chat.finish("completed"); return;
      }
      const { workspaces, defaultWorkspaceId } = placement;
      const threads = openDirectThreads(this.options.host.summaries(), conversation, workspaces);
      const page = this.options.host.conversationHistory({ conversationId: conversation.id, scope: "timeline", limit: 200 });
      const items = page.scope === "timeline" ? page.items : [];
      const proposal = await this.options.route({ message: execution.run.instruction, bot: direct, signal: controller.signal,
        recent: directRouterRecent(items), threads, workspaces, defaultWorkspaceId }).catch(() => null);
      const route = resolveDirectRoute({ route: proposal, message: execution.run.instruction, threads, workspaces, defaultWorkspaceId });
      const workspaceId = route.kind === "new" ? route.workspaceId : threads.find((thread) => thread.id === route.threadId)?.workspaceId ?? defaultWorkspaceId;
      const workspace = workspaces.find((entry) => entry.id === workspaceId) ?? workspaces[0];
      const bot = this.options.bot(workspace.id, direct.botId);
      if (!bot) { chat.milestone(`${direct.name} is no longer available in ${workspace.name}.`); chat.finish("completed"); return; }
      const deps = { host: this.options.host, nextId: this.options.nextId };
      const threadId = route.kind === "continue" ? route.threadId
        : await createBotThread(deps, conversation, bot, { ...workspace.workspace, access: "write" }, route.title, route.done ? { done: route.done } : {});
      const reply = await askBotThread(deps, { conversationId: threadId, signal: controller.signal, timeoutMs: this.options.replyTimeoutMs ?? REPLY_TIMEOUT_MS,
        instruction: directPrompt(direct, items, threadId, workspace.name, route.kind === "new" ? route.done : null), chatText: execution.run.instruction,
        onWaiting: () => chat.milestone(`${bot.name} is waiting for you.`) });
      if (reply.text) chat.reply(authorOf(bot), reply.text, threadId);
      else if (reply.status !== "interrupted") chat.milestone(`${bot.name} could not reply${reply.failure ? `: ${reply.failure}` : reply.status === "timed-out" ? " in time" : ""}.`);
      chat.finish(controller.signal.aborted ? "interrupted" : "completed");
    } catch (error) {
      chat.finish(controller.signal.aborted ? "interrupted" : "failed", error instanceof Error ? error.message : undefined);
    } finally { this.active.delete(execution.run.id); }
  }

  async interrupt({ run }: ProviderExecution): Promise<void> { this.active.get(run.id)?.abort(); }
  /** Direct-chat runs make no requests of their own; the bot asks in its work thread, and the chat shows those requests inline. */
  async respond(): Promise<void> {}
  async reconcile(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    if (!this.active.has(execution.run.id)) reconcileChatRun(execution, emit);
  }
  async close(): Promise<void> { for (const controller of this.active.values()) controller.abort(); }
}

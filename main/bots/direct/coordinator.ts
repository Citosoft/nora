import { NORA_PROVIDER_KIND } from "@shared/providers/providerKinds";
import { DIRECT_BINDING } from "@shared/bots/chats";
import { askBotThread, authorOf, createBotThread } from "@main/bots/conversations/runner";
import { chatMessages, chatTranscript } from "@main/bots/chats/transcript";
import { reconcileChatRun, startChatRun } from "@main/bots/chats/chatRun";
import { directPrompt } from "./prompt";
import { resolveDirectRoute } from "./routing";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { DirectDescriptor } from "@shared/types/bots/bots.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { EmitProviderUpdate, ExecutionProvider, ProviderExecution } from "@main/types/execution/provider.types";
import type { ChatWorkspace, DirectCoordinatorOptions, DirectWorkThread } from "@main/types/bots/chats.types";

const REPLY_TIMEOUT_MS = 15 * 60_000;
const ROUTER_CONTEXT_CHARS = 4_000;

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

  /** Workspaces the chat may work in: the bot's own workspace, or every workspace a global bot is available in. */
  private workspacesFor(direct: DirectDescriptor): ChatWorkspace[] {
    return this.options.workspaces().filter((entry) => direct.scope.kind === "workspace"
      ? entry.id === direct.scope.workspaceId : !!this.options.bot(entry.id, direct.botId));
  }

  private openThreads(chat: Conversation, workspaces: readonly ChatWorkspace[]): DirectWorkThread[] {
    return this.options.host.summaries().flatMap(({ conversation }) => {
      const workspace = workspaces.find((entry) => entry.id === conversation.workspace.projectId);
      return conversation.parentId === chat.id && !conversation.archivedAt && workspace ? [{ id: conversation.id, title: conversation.title,
        workspaceId: workspace.id, workspaceName: workspace.name, updatedAt: conversation.updatedAt }] : [];
    });
  }

  async start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const conversation = execution.snapshot.conversation;
    const direct = conversation.direct;
    const chat = startChatRun(execution, emit, this.options.now, "direct");
    if (!direct) { chat.finish("failed", "This thread is not a direct chat."); return; }
    const controller = new AbortController();
    this.active.set(execution.run.id, controller);
    try {
      const workspaces = this.workspacesFor(direct);
      if (!workspaces.length) { chat.milestone(`${direct.name} is not available in any open workspace.`); chat.finish("completed"); return; }
      const defaultWorkspaceId = workspaces.some((entry) => entry.id === direct.workspaceId) ? direct.workspaceId : workspaces[0].id;
      const threads = this.openThreads(conversation, workspaces);
      const page = this.options.host.conversationHistory({ conversationId: conversation.id, scope: "timeline", limit: 200 });
      const items = page.scope === "timeline" ? page.items : [];
      const proposal = await this.options.route({ message: execution.run.instruction, bot: direct, signal: controller.signal,
        recent: chatTranscript(chatMessages(items), -1, ROUTER_CONTEXT_CHARS), threads, workspaces, defaultWorkspaceId }).catch(() => null);
      const route = resolveDirectRoute({ route: proposal, message: execution.run.instruction, threads, workspaces, defaultWorkspaceId });
      const workspaceId = route.kind === "new" ? route.workspaceId : threads.find((thread) => thread.id === route.threadId)?.workspaceId ?? defaultWorkspaceId;
      const workspace = workspaces.find((entry) => entry.id === workspaceId) ?? workspaces[0];
      const bot = this.options.bot(workspace.id, direct.botId);
      if (!bot) { chat.milestone(`${direct.name} is no longer available in ${workspace.name}.`); chat.finish("completed"); return; }
      const deps = { host: this.options.host, nextId: this.options.nextId };
      const threadId = route.kind === "continue" ? route.threadId
        : await createBotThread(deps, conversation, bot, { ...workspace.workspace, access: "write" }, route.title);
      const reply = await askBotThread(deps, { conversationId: threadId, signal: controller.signal, timeoutMs: this.options.replyTimeoutMs ?? REPLY_TIMEOUT_MS,
        instruction: directPrompt(direct, items, threadId, workspace.name),
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

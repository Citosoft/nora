import { NORA_PROVIDER_KIND } from "@shared/providers/providerKinds";
import { GROUP_BINDING } from "@shared/bots/chats";
import { askBotThread, authorOf, ensureBotThread } from "@main/bots/conversations/runner";
import { groupPrompt } from "./prompt";
import { reconcileChatRun, startChatRun } from "@main/bots/chats/chatRun";
import { mentionedMembers } from "./speakers";
import { selectSpeakers } from "./selection";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { EmitProviderUpdate, ExecutionProvider, ProviderExecution } from "@main/types/execution/provider.types";
import type { GroupCoordinatorOptions } from "@main/types/bots/groups.types";

const REPLY_TIMEOUT_MS = 15 * 60_000;

/**
 * Runs group chats. Each user message becomes one run here; the coordinator picks who answers (see `selectSpeakers`),
 * asks each member in its own child thread, one at a time, and posts their replies into the group with an author.
 */
export class GroupCoordinator implements ExecutionProvider {
  readonly kind = NORA_PROVIDER_KIND;
  readonly instanceId = GROUP_BINDING.instanceId;
  readonly capabilities = { resume: true, interrupt: true, steering: false, approvals: false, questions: false, reasoning: false,
    attachments: false, turnChanges: false, subagentDetails: false };
  private readonly active = new Map<string, AbortController>();
  constructor(private readonly options: GroupCoordinatorOptions) {}

  async catalog(): Promise<ProviderCatalogResult> {
    return { status: "available", catalog: { kind: this.kind, instanceId: this.instanceId, capabilities: this.capabilities, authentication: "present",
      models: [{ id: GROUP_BINDING.model, name: "Group chat", description: "Members answer with their own models.", reasoningEfforts: [], defaultReasoningEffort: null }],
      policies: [{ id: GROUP_BINDING.permissionPolicy, label: "Members' own permissions" }] } };
  }

  async start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const conversation = execution.snapshot.conversation;
    const group = conversation.group;
    const chat = startChatRun(execution, emit, this.options.now, "group");
    if (!group) { chat.finish("failed", "This thread is not a group chat."); return; }
    const controller = new AbortController();
    this.active.set(execution.run.id, controller);
    try {
      const { speakers: queue, notice } = await selectSpeakers({ message: execution.run.instruction, group, route: this.options.route, signal: controller.signal });
      if (notice) { chat.milestone(notice); chat.finish("completed"); return; }
      const deps = { host: this.options.host, nextId: this.options.nextId };
      for (let replies = 0; queue.length && replies < group.hopLimit; replies += 1) {
        if (controller.signal.aborted) break;
        const member = queue.shift();
        if (!member) break;
        const bot = this.options.bot(conversation.workspace.projectId, member.botId);
        if (!bot) { chat.milestone(`${member.name} is no longer available in this workspace.`); continue; }
        const threadId = await ensureBotThread(deps, conversation, bot, group.writer === bot.id ? "write" : "read", `${bot.name} · ${conversation.title}`);
        const page = this.options.host.conversationHistory({ conversationId: conversation.id, scope: "timeline", limit: 200 });
        const reply = await askBotThread(deps, { conversationId: threadId, signal: controller.signal, timeoutMs: this.options.replyTimeoutMs ?? REPLY_TIMEOUT_MS,
          instruction: groupPrompt(conversation, group.members, member, page.scope === "timeline" ? page.items : []),
          onWaiting: () => chat.milestone(`${bot.name} is waiting for you.`) });
        if (reply.text) {
          chat.reply(authorOf(bot), reply.text, threadId);
          for (const next of mentionedMembers(reply.text, group.members, member.botId)) if (!queue.includes(next)) queue.push(next);
        } else if (reply.status !== "interrupted") {
          chat.milestone(`${bot.name} could not reply${reply.failure ? `: ${reply.failure}` : reply.status === "timed-out" ? " in time" : ""}.`);
        }
      }
      if (queue.length && !controller.signal.aborted) chat.milestone(`The group reached its limit of ${group.hopLimit} replies for one message.`);
      chat.finish(controller.signal.aborted ? "interrupted" : "completed");
    } catch (error) {
      chat.finish(controller.signal.aborted ? "interrupted" : "failed", error instanceof Error ? error.message : undefined);
    } finally { this.active.delete(execution.run.id); }
  }

  async interrupt({ run }: ProviderExecution): Promise<void> { this.active.get(run.id)?.abort(); }
  /** Group runs make no requests of their own; members ask in their own threads. */
  async respond(): Promise<void> {}
  async reconcile(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    if (!this.active.has(execution.run.id)) reconcileChatRun(execution, emit);
  }
  async close(): Promise<void> { for (const controller of this.active.values()) controller.abort(); }
}

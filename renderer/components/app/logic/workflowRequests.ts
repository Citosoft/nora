import type { LoopRunRole } from "@shared/appTypes";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { WorkflowRequestTarget } from "@/components/app/types/workflowSurface.types";

/** Follow parentage as well as source tags so delegated bot requests remain reachable from their owning stage. */
export function workflowRequestTargets(roles: readonly LoopRunRole[], summaries: readonly ConversationSummary[]): WorkflowRequestTarget[] {
  const owners = new Map(roles.flatMap((role) => role.conversationId ? [[role.conversationId, role] as const] : []));
  const threads = new Map(summaries.map((summary) => [summary.conversation.id, summary.conversation]));
  const targets: WorkflowRequestTarget[] = [];
  for (const summary of summaries) {
    if (!summary.pendingRequestCount) continue;
    let current = summary.conversation;
    const seen = new Set<string>();
    while (!seen.has(current.id)) {
      seen.add(current.id);
      const owner = owners.get(current.id);
      if (owner) {
        targets.push({ conversationId: summary.conversation.id, stageName: owner.name,
          ...(summary.conversation.bot ? { bot: { name: summary.conversation.bot.name, avatar: summary.conversation.bot.avatar } } : {}) });
        break;
      }
      const parent = current.parentId ? threads.get(current.parentId) : null;
      if (!parent) break;
      current = parent;
    }
  }
  return targets;
}

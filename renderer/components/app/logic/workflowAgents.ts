import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { WorkflowAgentSummary } from "@/components/app/types/workflowSurface.types";
import type { AgentCatalogEntry, LoopRoleDefinition } from "@shared/appTypes";

/** Shapes a workflow's ordered stages for display, naming each agent by its catalog label. */
export function buildWorkflowAgentSummaries(roles: readonly LoopRoleDefinition[], catalog: readonly AgentCatalogEntry[], bots: readonly BotDefinition[] = []): WorkflowAgentSummary[] {
  return roles.map((role) => {
    const bot = bots.find((entry) => entry.id === role.botId);
    return {
    id: role.id,
    name: role.name.trim() || (role.kind === "writer" ? "Writer" : "Reviewer"),
    toolId: role.toolId,
    toolLabel: `${role.botId ? `${bot?.name ?? role.botId} · ` : ""}${catalog.find((tool) => tool.id === role.toolId)?.label ?? role.toolId}`,
    model: role.model,
    kind: role.kind,
    ...(role.botId ? { botId: role.botId, avatar: bot?.avatar } : {})
    };
  });
}

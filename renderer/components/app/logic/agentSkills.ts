import type { AgentSkillCatalogSummary } from "@/components/app/types/component.types";
import type { AgentCatalogEntry, AgentSkillCatalog } from "@shared/appTypes";

export const SHARED_AGENT_SKILLS_TOOL_ID = "shared-agent-skills";

export function createAgentSkillCatalogMap(
  agentSkillCatalogs: AgentSkillCatalog[]
): Map<string, AgentSkillCatalog> {
  return new Map(agentSkillCatalogs.map((catalog) => [catalog.toolId, catalog]));
}

export function getSharedAgentSkillCatalog(
  skillCatalogByToolId: ReadonlyMap<string, AgentSkillCatalog>
): AgentSkillCatalog | null {
  return skillCatalogByToolId.get(SHARED_AGENT_SKILLS_TOOL_ID) || null;
}

export function getAgentSkillCatalogSummaries(
  agentCatalog: AgentCatalogEntry[],
  skillCatalogByToolId: ReadonlyMap<string, AgentSkillCatalog>
): AgentSkillCatalogSummary[] {
  const sharedCatalog = getSharedAgentSkillCatalog(skillCatalogByToolId);
  const toolSummaries: AgentSkillCatalogSummary[] = [];

  for (const tool of agentCatalog) {
    if (!tool.detected) {
      continue;
    }

    const catalog = skillCatalogByToolId.get(tool.id) || null;
    if (!catalog?.supported) {
      continue;
    }

    toolSummaries.push({
      toolId: tool.id,
      kind: "tool",
      label: tool.label,
      catalog
    });
  }

  return [
    ...(sharedCatalog?.supported
      ? [{
          toolId: sharedCatalog.toolId,
          kind: "shared",
          label: sharedCatalog.sourceLabel || "Shared skills",
          catalog: sharedCatalog
        } satisfies AgentSkillCatalogSummary]
      : []),
    ...toolSummaries
  ];
}

export function getSidebarSkillCatalogSummaries(
  agentCatalog: AgentCatalogEntry[],
  skillCatalogByToolId: ReadonlyMap<string, AgentSkillCatalog>
): AgentSkillCatalogSummary[] {
  return getAgentSkillCatalogSummaries(agentCatalog, skillCatalogByToolId);
}

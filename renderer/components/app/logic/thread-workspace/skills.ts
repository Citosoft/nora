import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ThreadSkillCatalog, ThreadSkillUse, ThreadSkillsSummary } from "@/components/app/types/threadSkills.types";

/**
 * Groups the thread's skill evidence by skill name. A confirmed load outranks a file read, so a skill
 * that was both read and loaded shows as loaded. Skills the runtime offers but the thread never used follow.
 */
export function summarizeThreadSkills(items: readonly TimelineItem[], catalog: ThreadSkillCatalog): ThreadSkillsSummary {
  const offered = catalog.status === "ready" ? catalog.skills : [];
  const agentLabels = new Map(items.flatMap((item) => item.kind === "subagent" ? [[item.nativeId, item.label] as const] : []));
  const uses = new Map<string, ThreadSkillUse>();
  for (const item of items) {
    const evidence = item.kind === "tool" ? item.details?.skill : undefined;
    if (item.kind !== "tool" || !evidence) continue;
    const use = uses.get(evidence.name) ?? { name: evidence.name, evidence: evidence.evidence, agents: [], calls: [] };
    if (evidence.evidence === "loaded") use.evidence = "loaded";
    use.calls.push(item);
    const agent = item.details?.parentId ? agentLabels.get(item.details.parentId) : undefined;
    if (agent && !use.agents.includes(agent)) use.agents.push(agent);
    uses.set(evidence.name, use);
  }
  const used = [...uses.values()].map((use) => {
    const skill = offered.find((entry) => entry.name === use.name);
    return skill ? { ...use, skill } : use;
  }).sort((a, b) => a.name.localeCompare(b.name));
  const available = offered.filter((skill) => !uses.has(skill.name)).sort((a, b) => a.name.localeCompare(b.name));
  return { catalog, used, available };
}

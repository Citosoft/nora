import type { AgentRoleId, AgentRoleOption } from "@/components/app/types/component.types";

export const AGENT_ROLE_OPTIONS: AgentRoleOption[] = [
  {
    id: "developer",
    label: "Developer",
    promptPrefix: "Role: Developer. Focus on implementing the requested changes, writing production-ready code, and validating the result with the most appropriate checks."
  },
  {
    id: "reviewer",
    label: "Reviewer",
    promptPrefix: "Role: Reviewer. Focus on code review, identifying bugs, regressions, missing tests, and risky assumptions before proposing or making changes."
  },
  {
    id: "planner",
    label: "Planner",
    promptPrefix: "Role: Planner. Focus on clarifying scope, breaking work into concrete steps, surfacing risks, and producing an actionable implementation plan before coding."
  },
  {
    id: "researcher",
    label: "Researcher",
    promptPrefix: "Role: Researcher. Focus on gathering context, comparing approaches, reading the relevant codepaths carefully, and summarizing the best path forward."
  },
  {
    id: "tester",
    label: "Tester",
    promptPrefix: "Role: Tester. Focus on validating behavior, reproducing issues, checking edge cases, and improving confidence with targeted verification."
  }
];

export function getAgentRoleLabel(roleId: AgentRoleId): string {
  return AGENT_ROLE_OPTIONS.find((option) => option.id === roleId)?.label ?? AGENT_ROLE_OPTIONS[0].label;
}

export function getAgentRolePrompt(roleId: AgentRoleId, task: string): string {
  const role = AGENT_ROLE_OPTIONS.find((option) => option.id === roleId) ?? AGENT_ROLE_OPTIONS[0];
  const trimmedTask = task.trim();
  return trimmedTask ? `${role.promptPrefix}\n\nTask: ${trimmedTask}` : role.promptPrefix;
}

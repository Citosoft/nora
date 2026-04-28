import type { AllAgentsGroupBy } from "@/components/app/types/workspaceSidebarAllAgents.types";

export const WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_OPTIONS: readonly { value: AllAgentsGroupBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "workspace", label: "Workspace" },
  { value: "pr_status", label: "PR status" }
];

export const WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_CYCLE: AllAgentsGroupBy[] =
  WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_OPTIONS.map((option) => option.value);

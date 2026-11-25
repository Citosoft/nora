import type { RoleId } from "@shared/types/personalization/roles.types";
import { WORKSPACE_TOOLS } from "@/components/app/constants/workspaceTools";
import type { WorkspaceToolId, WorkspaceToolItem } from "@/components/app/types/workspaceNavigation.types";

/** Tools pinned to the sidebar rail before you pin or unpin any yourself; tools a workspace lacks (such as MRs outside Git) drop out. */
const ROLE_WORKSPACE_TOOL_PINS: Readonly<Record<RoleId, readonly WorkspaceToolId[]>> = {
  developer: ["terminals", "merge-requests", "issues", "browser"],
  designer: ["browser", "documents", "library"],
  product: ["tasks", "issues", "documents", "workflows"],
  writing: ["documents", "library"],
  research: ["browser", "library", "documents"],
  operations: ["tasks", "workflows", "documents"],
  general: ["documents", "tasks", "browser"],
  custom: ["documents", "tasks", "browser"]
};
const UNSET_ROLE_PINS: readonly WorkspaceToolId[] = ["terminals", "browser", "documents", "library"];

export function defaultWorkspaceToolPins(role: RoleId | null): readonly WorkspaceToolId[] {
  return role ? ROLE_WORKSPACE_TOOL_PINS[role] : UNSET_ROLE_PINS;
}

export function workspaceToolItems(tools: readonly WorkspaceToolId[]): WorkspaceToolItem[] {
  return tools.flatMap((id) => WORKSPACE_TOOLS.find((tool) => tool.id === id) ?? []);
}

export function workspaceToolLabels(tools: readonly WorkspaceToolId[]): string[] {
  return workspaceToolItems(tools).map((tool) => tool.label);
}

export function availableWorkspaceTools(git: boolean): WorkspaceToolId[] {
  return [...(git ? ["worktrees", "merge-requests", "issues"] as const : []), "documents", "library", "tasks", "terminals", "browser", "workflows"];
}

/** Saved pins win once you've pinned or unpinned anything in a workspace; until then the role's defaults apply. */
export function workspaceToolPins(available: readonly WorkspaceToolId[], saved: readonly WorkspaceToolId[] | undefined, defaults: readonly WorkspaceToolId[]): WorkspaceToolId[] {
  return [...new Set(saved ?? defaults)].filter((tool) => available.includes(tool));
}

export function toggleWorkspaceToolPin(pins: readonly WorkspaceToolId[], tool: WorkspaceToolId): WorkspaceToolId[] {
  return pins.includes(tool) ? pins.filter((entry) => entry !== tool) : [...new Set([...pins, tool])];
}

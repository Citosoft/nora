import type { WorkspaceToolId } from "@/components/app/types/workspaceNavigation.types";

export const DEFAULT_WORKSPACE_TOOL_PINS: readonly WorkspaceToolId[] = ["terminals", "browser", "documents"];

export function availableWorkspaceTools(git: boolean): WorkspaceToolId[] {
  return [...(git ? ["worktrees", "merge-requests", "issues"] as const : []), "documents", "tasks", "terminals", "browser", "workflows"];
}

export function workspaceToolPins(available: readonly WorkspaceToolId[], pins: readonly WorkspaceToolId[] = DEFAULT_WORKSPACE_TOOL_PINS): WorkspaceToolId[] {
  return [...new Set(pins)].filter((tool) => available.includes(tool));
}

export function toggleWorkspaceToolPin(pins: readonly WorkspaceToolId[], tool: WorkspaceToolId): WorkspaceToolId[] {
  return pins.includes(tool) ? pins.filter((entry) => entry !== tool) : [...new Set([...pins, tool])];
}

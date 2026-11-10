import { roleProfile } from "@shared/personalization/profiles";
import type { RoleSelection, RoleTool } from "@shared/types/personalization/roles.types";
import type { WorkspaceToolId } from "@/components/app/types/workspaceNavigation.types";

const toolMapping: Readonly<Record<RoleTool, WorkspaceToolId>> = {
  files: "files", changes: "changes", terminal: "terminals", browser: "browser", notes: "documents",
  tasks: "tasks", workflows: "workflows", editor: "files", previews: "browser"
};
export function availableWorkspaceTools(git: boolean): WorkspaceToolId[] {
  return ["files", ...(git ? ["changes", "development"] as const : []), "documents", "tasks", "workflows", "terminals", "browser"];
}
export function workspaceToolPins(role: RoleSelection | null, available: readonly WorkspaceToolId[], pins?: readonly WorkspaceToolId[]): WorkspaceToolId[] {
  const defaults = roleProfile(role ?? { id: "general" }).tools.map((tool) => toolMapping[tool]);
  const selection = pins ?? [...new Set(defaults)].slice(0, 3);
  return [...new Set(selection)].filter((tool) => available.includes(tool));
}
export function toggleWorkspaceToolPin(pins: readonly WorkspaceToolId[], tool: WorkspaceToolId): WorkspaceToolId[] {
  return pins.includes(tool) ? pins.filter((entry) => entry !== tool) : [...pins, tool];
}

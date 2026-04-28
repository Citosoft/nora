import type { buildAgentTerminalActionsDependencies, buildSessionActionsDependencies } from "./dependencyBuilders";
import type { createWorkspaceActions } from "./workspaceActions";

export function createSessionActionDependencyMap(
  options: Parameters<typeof buildSessionActionsDependencies>[0]
): Parameters<typeof buildSessionActionsDependencies>[0] {
  return options;
}

export function createWorkspaceActionDependencyMap(
  options: Parameters<typeof createWorkspaceActions>[0]
): Parameters<typeof createWorkspaceActions>[0] {
  return options;
}

export function createAgentTerminalActionDependencyMap(
  options: Parameters<typeof buildAgentTerminalActionsDependencies>[0]
): Parameters<typeof buildAgentTerminalActionsDependencies>[0] {
  return options;
}

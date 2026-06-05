import type { StartupDependencyId, StartupDependencyReport } from "@shared/types/startupDependency.types";

const NPM_COMMAND_PATTERN = /\bnpm(?:\.cmd|\.exe)?\b/i;
const NPX_COMMAND_PATTERN = /\bnpx(?:\.cmd|\.exe)?\b/i;

export function getRequiredInstallDependencies(installCommand: string): StartupDependencyId[] {
  const required: StartupDependencyId[] = [];
  const normalizedCommand = installCommand.trim();
  if (!normalizedCommand) {
    return required;
  }

  if (NPM_COMMAND_PATTERN.test(normalizedCommand)) {
    required.push("npm");
  }
  if (NPX_COMMAND_PATTERN.test(normalizedCommand)) {
    required.push("npx");
  }

  return required;
}

export function getMissingInstallDependencies(
  installCommand: string,
  report: StartupDependencyReport | null
): StartupDependencyId[] {
  const required = getRequiredInstallDependencies(installCommand);
  if (!required.length) {
    return [];
  }

  if (!report) {
    return required;
  }

  const availabilityById = new Map(
    report.dependencies.map((dependency) => [dependency.id, dependency.status])
  );
  return required.filter((dependencyId) => availabilityById.get(dependencyId) !== "available");
}

export function formatDependencyLabel(dependencyId: StartupDependencyId): string {
  if (dependencyId === "gh") {
    return "GitHub CLI";
  }
  if (dependencyId === "npm" || dependencyId === "npx") {
    return dependencyId;
  }
  return dependencyId;
}

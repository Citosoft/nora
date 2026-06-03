import type { StartupDependency } from "@shared/types/startupDependency.types";

const BACKTICKED_COMMAND_PATTERN = /`([^`]+)`/g;

function looksLikeInstallCommand(value: string): boolean {
  return /\s/.test(value.trim());
}

function extractInstallCommand(value: string): string | null {
  for (const match of value.matchAll(BACKTICKED_COMMAND_PATTERN)) {
    const command = match[1]?.trim();
    if (command && looksLikeInstallCommand(command)) {
      return command;
    }
  }

  return null;
}

export function buildStartupDependencyCopyText(dependency: StartupDependency): string | null {
  const installHintCommand = dependency.installHint ? extractInstallCommand(dependency.installHint) : null;
  if (installHintCommand) {
    return installHintCommand;
  }

  for (const instruction of dependency.manualInstructions) {
    const command = extractInstallCommand(instruction);
    if (command) {
      return command;
    }
  }

  return null;
}

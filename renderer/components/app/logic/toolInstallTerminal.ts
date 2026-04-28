import type { CreateTerminalPayload } from "@shared/appTypes";

function buildInstallCommandForTerminal(command: string, platform: NodeJS.Platform): string {
  if (platform === "win32") {
    return command;
  }

  return `{ ${command}; }; exit_code=$?; echo \"__NORA_INSTALL_EXIT_CODE__:$exit_code\"; if [ $exit_code -eq 0 ]; then echo \"[install finished with code 0]\"; else echo \"[install failed with code $exit_code]\"; fi; exec \${SHELL:-/bin/zsh} -il`;
}

export function createToolInstallTerminalPayload(
  toolLabel: string,
  installCommand: string,
  platform: NodeJS.Platform = process.platform
): CreateTerminalPayload {
  const normalizedLabel = toolLabel.trim() || "CLI";
  const normalizedCommand = installCommand.trim();

  return {
    name: `Install ${normalizedLabel}`,
    target: { kind: "root" },
    launchConfig: {
      kind: "script",
      label: `Install ${normalizedLabel}`,
      command: buildInstallCommandForTerminal(normalizedCommand, platform)
    }
  };
}

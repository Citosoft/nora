import type { CreateTerminalPayload, TerminalPreset, TerminalShellOption } from "@shared/appTypes";

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function escapeDoubleQuotes(value: string): string {
  return value.replace(/"/g, "\"\"");
}

function joinCommandsForShell(executable: string, commands: string[]): string {
  const normalized = executable.toLowerCase();

  if (normalized.endsWith("powershell.exe") || normalized.endsWith("pwsh.exe")) {
    return commands.join("; ");
  }

  return commands.join(" && ");
}

function renderChangeDirectoryCommand(executable: string, workingDirectory: string): string {
  const normalized = executable.toLowerCase();

  if (normalized.endsWith("powershell.exe") || normalized.endsWith("pwsh.exe")) {
    return `Set-Location -LiteralPath '${workingDirectory.replace(/'/g, "''")}'`;
  }

  if (normalized.endsWith("cmd.exe")) {
    return `cd /d "${escapeDoubleQuotes(workingDirectory)}"`;
  }

  return `cd ${shellQuote(workingDirectory)}`;
}

export function buildTerminalPresetCommand(preset: TerminalPreset, shell: TerminalShellOption): string {
  const workingDirectory = preset.workingDirectory.trim();
  const commands = preset.commands
    .map((command) => command.trim())
    .filter((command) => command.length > 0);
  const chainedCommands = [
    ...(workingDirectory ? [renderChangeDirectoryCommand(shell.executable, workingDirectory)] : []),
    ...commands
  ];

  return joinCommandsForShell(shell.executable, chainedCommands);
}

export function createTerminalPresetPayload(
  preset: TerminalPreset,
  shell: TerminalShellOption
): CreateTerminalPayload {
  return {
    name: preset.name.trim() || "Terminal",
    shellId: shell.id,
    target: { kind: "session-default" },
    launchConfig: {
      kind: "script",
      label: preset.name.trim() || "Terminal preset",
      command: buildTerminalPresetCommand(preset, shell)
    }
  };
}

export function isRunnableTerminalPreset(preset: TerminalPreset): boolean {
  return preset.name.trim().length > 0 && preset.commands.some((command) => command.trim().length > 0);
}

export function resolveTerminalPresetShell(
  preset: TerminalPreset,
  terminalShells: TerminalShellOption[],
  preferredShellId: string | null
): TerminalShellOption | null {
  const presetShell = preset.shellId
    ? terminalShells.find((shell) => shell.id === preset.shellId) ?? null
    : null;
  if (presetShell) {
    return presetShell;
  }

  const preferredShell = preferredShellId
    ? terminalShells.find((shell) => shell.id === preferredShellId) ?? null
    : null;
  if (preferredShell) {
    return preferredShell;
  }

  return terminalShells[0] ?? null;
}

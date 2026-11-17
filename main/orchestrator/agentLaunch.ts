export type NormalizeAgentLaunchCommandOptions = {
  isWindowsPlatform?: boolean;
};

export type AgentLaunchStartupOptions = NormalizeAgentLaunchCommandOptions & {
  initialPrompt?: string;
  initialPromptDelivery?: import("@shared/agentStartupCapabilities").AgentInitialPromptDelivery;
};

function normalizeCursorWindowsLaunchCommand(command: string): string {
  let normalized = command.trim();

  // Cmd.exe does not treat single quotes as quoting characters.
  if (normalized.startsWith("'") && normalized.endsWith("'") && normalized.length > 1) {
    normalized = normalized.slice(1, -1).trim();
  }

  // Some callers persist escaped quotes literally (e.g. \"C:\path\tool.cmd\").
  if (normalized.includes("\\\"")) {
    normalized = normalized.replace(/\\"/g, "\"");
  }

  // Persisted JSON-like command strings can also double-escape separators.
  if (normalized.includes("\\\\")) {
    normalized = normalized.replace(/\\\\/g, "\\");
  }

  return normalized;
}

function quoteLaunchArgument(value: string, isWindowsPlatform: boolean): string {
  if (isWindowsPlatform) {
    return `"${value.replace(/"/g, "\\\"").replace(/\r?\n/g, " ")}"`;
  }

  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function buildAgentLaunchCommand(
  toolId: string,
  command: string,
  options?: AgentLaunchStartupOptions
): string {
  const isWindowsPlatform = options?.isWindowsPlatform ?? process.platform === "win32";
  let launchCommand = normalizeAgentLaunchCommand(toolId, command, { isWindowsPlatform });
  const initialPrompt = options?.initialPrompt?.trim() ?? "";
  const shouldPresetPrompt = options?.initialPromptDelivery === "launch-command" && initialPrompt.length > 0;
  const quotedPrompt = shouldPresetPrompt ? quoteLaunchArgument(initialPrompt, isWindowsPlatform) : "";

  if (!shouldPresetPrompt) {
    return launchCommand;
  }

  if (toolId === "codex" || toolId === "claude") {
    return `${launchCommand} ${quotedPrompt}`;
  }

  return launchCommand;
}

export function normalizeAgentLaunchCommand(
  toolId: string,
  command: string,
  options?: NormalizeAgentLaunchCommandOptions
): string {
  let trimmed = command.trim();
  if (!trimmed) {
    return trimmed;
  }

  const isWindowsPlatform = options?.isWindowsPlatform ?? process.platform === "win32";
  if (toolId === "cursor" && isWindowsPlatform) {
    trimmed = normalizeCursorWindowsLaunchCommand(trimmed);
  }

  if (toolId === "codex" && !/\s--no-alt-screen(?:\s|$)/.test(` ${trimmed} `)) {
    return `${trimmed} --no-alt-screen`;
  }

  return trimmed;
}

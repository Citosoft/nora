export type NormalizeAgentLaunchCommandOptions = {
  isWindowsPlatform?: boolean;
};

const RESUME_ID_PATTERN = /[A-Za-z0-9._:-]+/;

function normalizeResumeIdentifier(value: string): string {
  const match = value.trim().match(RESUME_ID_PATTERN);
  return match?.[0] || "";
}

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

function normalizeGeminiResumeCommand(command: string): string {
  return command.replace(
    /(--resume(?:=|\s+))(?:'([^']+)'|"([^"]+)"|([^\s]+))/gi,
    (_match, prefix: string, singleQuoted: string | undefined, doubleQuoted: string | undefined, bare: string | undefined) => {
      const rawResumeId = singleQuoted ?? doubleQuoted ?? bare ?? "";
      const normalizedResumeId = normalizeResumeIdentifier(rawResumeId);
      return normalizedResumeId ? `${prefix}${normalizedResumeId}` : `${prefix}${rawResumeId}`;
    }
  );
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

  if (toolId === "gemini") {
    return normalizeGeminiResumeCommand(trimmed);
  }

  return trimmed;
}

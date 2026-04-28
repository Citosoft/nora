import stripAnsi from "strip-ansi";

export function normalizeTerminalChunkForContext(value: string): string {
  return stripAnsi(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

const AGENT_FOOTER_LINE_REGEXES: RegExp[] = [
  /^(?:tip|model|directory)\s*:/i,
  /^(?:esc|escape|ctrl|cmd|alt|shift|tab|enter|return)\b/i,
  /\b(?:esc|escape|ctrl|cmd|alt|shift|tab|enter|return)\b.*\b(?:to|for)\b/i,
  /^\?\s*for\s*help\b/i
];

const AGENT_PROGRESS_LINE_REGEX =
  /^(?:[\u2022*\-]?\s*)?(?:thinking|analy[sz]ing|planning|working|executing|running|searching|reading|writing|editing|patching|applying|compiling|building|installing|testing|processing|generating|creating|updating|invoking)\b/i;

function isAgentFooterLine(line: string): boolean {
  return AGENT_FOOTER_LINE_REGEXES.some((pattern) => pattern.test(line));
}

function isLikelyPromptOrCommandEcho(line: string): boolean {
  return (
    line.startsWith("$ cd ") ||
    line.startsWith("$ ") ||
    line.startsWith("> ") ||
    line.startsWith(">_") ||
    line.startsWith("\u203A ") ||
    line.startsWith("PS ") ||
    /^[A-Za-z]:\\.*>\s*$/.test(line) ||
    /^[^@\s]+@[^:\s]+:[^#$%]*[$#%]\s*$/.test(line) ||
    /^[^#$%]*[$#%]\s*$/.test(line)
  );
}

export function isAgentContextLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  if (/^[\W_]+$/.test(trimmed)) {
    return false;
  }

  if (isLikelyPromptOrCommandEcho(trimmed)) {
    return false;
  }

  if (isAgentFooterLine(trimmed)) {
    return false;
  }

  if (AGENT_PROGRESS_LINE_REGEX.test(trimmed)) {
    return false;
  }

  if (/\besc\s+to\s+interrupt\b/i.test(trimmed)) {
    return false;
  }

  return true;
}

export function extractAgentContextLines(value: string): string[] {
  return normalizeTerminalChunkForContext(value)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => isAgentContextLine(line));
}

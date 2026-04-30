import stripAnsi from "strip-ansi";

export function normalizeTerminalChunkForContext(value: string): string {
  return stripAnsi(value)
    .replace(/\r\n/g, "\n")
    // Bare CR is TTY "return to column 0" (often follows each echoed keystroke). Treating it as LF
    // split every character into its own "line" and flooded agent context. Drop CR without LF.
    .replace(/\r/g, "");
}

const AGENT_FOOTER_LINE_REGEXES: RegExp[] = [
  /^(?:tip|model|directory)\s*:/i,
  /^(?:esc|escape|ctrl|cmd|alt|shift|tab|enter|return)\b/i,
  /\b(?:esc|escape|ctrl|cmd|alt|shift|tab|enter|return)\b.*\b(?:to|for)\b/i,
  /^\?\s*for\s*help\b/i
];

/**
 * Status / "thinking" lines from agent CLIs (Gemini, Codex, etc.) often prefix with spinners, bullets,
 * or markdown — not only `•` / `*`. If we only anchored at `^`, those lines became tracked context and
 * spammed duplicates as the UI updated every tick.
 */
function stripLeadingThinkingLineDecorators(line: string): string {
  return line.replace(/^[\s\u2800-\u28FF·•\u00b7\*\-\[\]│┃〈〉【】▸►▶]+/u, "").trimStart();
}

const AGENT_PROGRESS_OR_THINKING_LINE_REGEX =
  /^(?:[\u2022*\-·\u00b7]?\s*)?(?:thinking|reasoning|analy[sz]ing|planning|working|executing|running|searching|reading|writing|editing|patching|applying|compiling|building|installing|testing|processing|generating|creating|updating|invoking|contemplating|pondering|preparing(?:\s+a)?\s+response|loading(?:\.\.\.)?|please\s+wait|model\s+is\s+thinking|thought\s+for\s+\d+s?)(?:\b|$)/i;

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

function isSpinnerOrDecorationOnlyLine(trimmed: string): boolean {
  return /^[\s\u2800-\u28FF·•\u00b7]+$/.test(trimmed);
}

/** Gemini CLI redraws a wide column status row (workspace / branch / sandbox / model / quota). */
function isWideSpacedGeminiQuotaBanner(trimmed: string): boolean {
  if (!/workspace\s*\(\/directory\)/i.test(trimmed)) {
    return false;
  }
  const wideGaps = trimmed.match(/\s{5,}/g);
  return wideGaps !== null && wideGaps.length >= 3;
}

/** Second banner row: `~/repo … branch … model …` with column-like spacing (Gemini quota strip). */
function isWideSpacedHomePathModelRow(trimmed: string): boolean {
  if (!/^\s*~\/\S+/.test(trimmed)) {
    return false;
  }
  const wideGaps = trimmed.match(/\s{5,}/g);
  if (wideGaps === null || wideGaps.length < 3) {
    return false;
  }
  return /\b(sandbox|quota|gemini|%)\b/i.test(trimmed);
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

  if (isSpinnerOrDecorationOnlyLine(trimmed)) {
    return false;
  }

  if (isWideSpacedGeminiQuotaBanner(trimmed) || isWideSpacedHomePathModelRow(trimmed)) {
    return false;
  }

  const forStatusMatch = stripLeadingThinkingLineDecorators(trimmed.replace(/\*+/g, "").trim());
  if (AGENT_PROGRESS_OR_THINKING_LINE_REGEX.test(forStatusMatch)) {
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

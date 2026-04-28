import { stripAnsi } from "./shell";

const BOX_DRAWING_OR_MOJIBAKE_PREFIX_REGEX = /^(?:[\u2500-\u259f]|â[”•€])/;
const PUNCTUATION_ONLY_REGEX = /^[\W_]+$/;
const COMMAND_ECHO_PREFIXES = ["$ cd ", "$ ", ">", "›", ">_"];

const AGENT_FOOTER_LINE_REGEXES: RegExp[] = [
  /^(?:tip|model|directory)\s*:/i,
  /^(?:esc|escape|ctrl|cmd|alt|shift|tab|enter|return)\b/i,
  /\b(?:esc|escape|ctrl|cmd|alt|shift|tab|enter|return)\b.*\b(?:to|for)\b/i,
  /^\?\s*for\s*help\b/i
];

function normalizeTerminalValue(value: string): string {
  return stripAnsi(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function isBaseMeaningfulLine(line: string): boolean {
  if (!line) {
    return false;
  }

  if (COMMAND_ECHO_PREFIXES.some((prefix) => line.startsWith(prefix))) {
    return false;
  }

  if (BOX_DRAWING_OR_MOJIBAKE_PREFIX_REGEX.test(line)) {
    return false;
  }

  if (PUNCTUATION_ONLY_REGEX.test(line)) {
    return false;
  }

  return true;
}

function isAgentFooterLine(line: string): boolean {
  return AGENT_FOOTER_LINE_REGEXES.some((pattern) => pattern.test(line));
}

function extractMeaningfulLines(value: string): string[] {
  return normalizeTerminalValue(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(isBaseMeaningfulLine);
}

export function getLastMeaningfulTerminalLine(value: string): string {
  const lines = extractMeaningfulLines(value);
  return lines.at(-1) || "";
}

export function getLastMeaningfulAgentOutputLine(value: string): string {
  const lines = extractMeaningfulLines(value).filter((line) => !isAgentFooterLine(line));
  return lines.at(-1) || "";
}


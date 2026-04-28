import { stripAnsi } from "./shell";

const BUSY_ACTIVITY_KEYWORD_REGEX =
  /\b(thinking|analy[sz]ing|planning|working|execut(?:e|ing|ed)|running|searching|reading|writing|editing|patch(?:ing|ed)?|applying|compil(?:e|ing|ed)|build(?:ing)?|install(?:ing|ed)?|test(?:ing|ed)?|processing|generating|creating|updating|invoking|tool\s+call|function\s+call|mcp)\b/i;
const PROGRESS_PREFIX_REGEX = /^(?:[>›»]+\s*)+/;

function normalizeTerminalChunk(value: string): string {
  return stripAnsi(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function getBusyCandidateLines(value: string): string[] {
  const normalized = normalizeTerminalChunk(value);
  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("$ cd "))
    .filter((line) => !line.startsWith("$ "))
    .filter((line) => !line.startsWith(">_"))
    .filter((line) => !/^(?:>|›|»)\s*$/.test(line))
    .filter((line) => !line.startsWith("PS "))
    .filter((line) => !/^[A-Za-z]:\\.*>\s*$/.test(line))
    .filter((line) => !/^[^@\s]+@[^:\s]+:[^#$%]*[$#%]\s*$/.test(line))
    .filter((line) => !/^[^#$%]*[$#%]\s*$/.test(line))
    .filter((line) => !/^[\W_]+$/.test(line));
}

export function hasBusyTerminalActivity(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  const lines = getBusyCandidateLines(value);
  if (!lines.length) {
    return false;
  }

  return lines.some((line) => {
    const normalizedLine = line.replace(PROGRESS_PREFIX_REGEX, "").trim();
    return BUSY_ACTIVITY_KEYWORD_REGEX.test(line) || BUSY_ACTIVITY_KEYWORD_REGEX.test(normalizedLine);
  });
}

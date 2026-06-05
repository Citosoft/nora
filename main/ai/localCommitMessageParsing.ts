import { extractLlamaCliStdout, stripInlineLlamaNoise, unwrapQuotedModelLine } from "./localLlamaOutput";

export function extractLocalCommitMessageFromModelOutput(rawText: string): string {
  const normalized = extractLlamaCliStdout(rawText);
  if (!normalized) {
    return "";
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => stripInlineLlamaNoise(line))
    .filter((line) => line.length > 0);

  const candidates = lines.filter(isPlausibleCommitSubjectLine).map(unwrapQuotedModelLine);
  if (candidates.length > 0) {
    return candidates[candidates.length - 1];
  }

  const fallback = unwrapQuotedModelLine(lines[lines.length - 1] ?? "");
  return isPlausibleCommitSubjectLine(fallback) ? fallback : "";
}

function isPlausibleCommitSubjectLine(line: string): boolean {
  if (!line || line.length > 100) {
    return false;
  }
  if (/^(you write|generate a single|generate one|requirements|changed files|diff context|no diff|files:|diff:)/i.test(line)) {
    return false;
  }
  if (/^[-#+@`|]/.test(line)) {
    return false;
  }
  if (/^[\s.*-]+$/.test(line)) {
    return false;
  }
  return true;
}

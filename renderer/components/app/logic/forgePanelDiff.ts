import type { ForgeWorkItemComment } from "@shared/appTypes";
import { MAX_FORGE_DIFF_PREVIEW_CHARS } from "@shared/forgeDiff";
import type { DiffLineTone, ParsedDiffLine } from "@/components/app/types/diffLine.types";


export function formatDiffPreview(diff: string): string {
  const normalized = diff.trim();
  if (!normalized) {
    return "No diff content available for this file.";
  }

  if (normalized.length <= MAX_FORGE_DIFF_PREVIEW_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_FORGE_DIFF_PREVIEW_CHARS)}\n\n… Diff truncated for display`;
}

/**
 * Drops the `diff --git`/`index`/`---`/`+++` preamble that a file card already shows, plus the trailing blank line.
 * Patches with no hunk (binary or mode-only changes) keep their header lines, since that is all they have.
 */
export function withoutFileHeader(lines: ParsedDiffLine[]): ParsedDiffLine[] {
  const firstHunk = lines.findIndex((line) => line.tone === "hunk");
  const body = firstHunk > 0 ? lines.slice(firstHunk) : lines;
  return body.at(-1)?.text === "" ? body.slice(0, -1) : body;
}

const KEY_PREFIX: Record<DiffLineTone, string> = { hunk: "hunk", addition: "add", deletion: "del", context: "ctx", metadata: "meta" };

/** File headers (`---`/`+++`) only appear before the first hunk; inside one, a `---value` line is a deleted `--value`. */
function lineTone(line: string, inHunk: boolean): DiffLineTone {
  if (line.startsWith("@@")) return "hunk";
  if (!inHunk) return "metadata";
  if (line.startsWith("+")) return "addition";
  if (line.startsWith("-")) return "deletion";
  if (line.startsWith(" ")) return "context";
  return "metadata";
}

export function parseDiffLines(diff: string): ParsedDiffLine[] {
  let oldLine: number | null = null;
  let newLine: number | null = null;
  let inHunk = false;
  return diff.split("\n").map((text, index) => {
    if (text.startsWith("diff --git ")) inHunk = false;
    const tone = lineTone(text, inHunk);
    const key = `${KEY_PREFIX[tone]}-${index}`;
    if (tone === "hunk") {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text);
      inHunk = match !== null;
      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
      }
      return { key, text, tone, oldLine: null, newLine: null };
    }
    const row: ParsedDiffLine = {
      key, text, tone,
      oldLine: tone === "deletion" || tone === "context" ? oldLine : null,
      newLine: tone === "addition" || tone === "context" ? newLine : null
    };
    if (row.oldLine !== null) oldLine = row.oldLine + 1;
    if (row.newLine !== null) newLine = row.newLine + 1;
    return row;
  });
}

export function getInlineCommentKey(path: string, oldLine: number | null, newLine: number | null): string {
  return `${path}|${oldLine ?? ""}|${newLine ?? ""}`;
}

export function splitForgeComments(comments: ForgeWorkItemComment[]): {
  topLevelComments: ForgeWorkItemComment[];
  inlineCommentsByKey: Map<string, ForgeWorkItemComment[]>;
} {
  const topLevelComments: ForgeWorkItemComment[] = [];
  const inlineCommentsByKey = new Map<string, ForgeWorkItemComment[]>();

  comments.forEach((comment) => {
    if (!comment.path || (comment.oldLine === null && comment.newLine === null)) {
      topLevelComments.push(comment);
      return;
    }

    const key = getInlineCommentKey(comment.path, comment.oldLine, comment.newLine);
    inlineCommentsByKey.set(key, [...(inlineCommentsByKey.get(key) ?? []), comment]);
  });

  return {
    topLevelComments,
    inlineCommentsByKey
  };
}

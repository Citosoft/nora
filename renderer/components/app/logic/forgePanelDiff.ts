import type { ForgeWorkItemComment } from "@shared/appTypes";

const MAX_DIFF_CHARS = 12_000;

export type ParsedDiffLine = {
  key: string;
  text: string;
  oldLine: number | null;
  newLine: number | null;
};

export function formatDiffPreview(diff: string): string {
  const normalized = diff.trim();
  if (!normalized) {
    return "No diff content available for this file.";
  }

  if (normalized.length <= MAX_DIFF_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_DIFF_CHARS)}\n\n… Diff truncated for display`;
}

export function parseDiffLines(diff: string): ParsedDiffLine[] {
  const lines = diff.split("\n");
  let oldLine: number | null = null;
  let newLine: number | null = null;
  return lines.map((line, index) => {
    if (line.startsWith("@@")) {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
      }
      return { key: `hunk-${index}`, text: line, oldLine: null, newLine: null };
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      const row: ParsedDiffLine = { key: `add-${index}`, text: line, oldLine: null, newLine };
      if (newLine !== null) {
        newLine += 1;
      }
      return row;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      const row: ParsedDiffLine = { key: `del-${index}`, text: line, oldLine, newLine: null };
      if (oldLine !== null) {
        oldLine += 1;
      }
      return row;
    }

    if (line.startsWith(" ")) {
      const row: ParsedDiffLine = { key: `ctx-${index}`, text: line, oldLine, newLine };
      if (oldLine !== null) {
        oldLine += 1;
      }
      if (newLine !== null) {
        newLine += 1;
      }
      return row;
    }

    return { key: `meta-${index}`, text: line, oldLine: null, newLine: null };
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

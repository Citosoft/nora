import type { DiffLine, DiffLineCounts } from "@shared/types/conversation/diff.types";

/** Only hunk bodies describe edits; +++/--- file headers are metadata. */
export function parsePatchLines(patch: string): DiffLine[] {
  let inHunk = false;
  let beforeRemaining = 0;
  let afterRemaining = 0;
  return patch.split("\n").map((text) => {
    if (text.startsWith("diff --git ")) inHunk = false;
    const hunk = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/.exec(text);
    if (hunk) {
      beforeRemaining = Number(hunk[1] ?? 1); afterRemaining = Number(hunk[2] ?? 1);
      inHunk = beforeRemaining > 0 || afterRemaining > 0;
      return { text, kind: "metadata" };
    }
    const kind = inHunk && text.startsWith("+") ? "addition" : inHunk && text.startsWith("-") ? "deletion"
      : inHunk && text.startsWith(" ") ? "context" : "metadata";
    if (kind === "addition" || kind === "context") afterRemaining--;
    if (kind === "deletion" || kind === "context") beforeRemaining--;
    if (beforeRemaining <= 0 && afterRemaining <= 0) inHunk = false;
    return { text, kind };
  });
}

export function patchLineCounts(patch: string | null | undefined): DiffLineCounts | null {
  if (!patch || /^(?:Binary files |GIT binary patch)/m.test(patch)) return null;
  const counts = { additions: 0, deletions: 0 };
  for (const line of parsePatchLines(patch)) {
    if (line.kind === "addition") counts.additions++;
    else if (line.kind === "deletion") counts.deletions++;
  }
  return counts;
}

export function sumPatchLineCounts(patches: readonly (string | null | undefined)[]): DiffLineCounts | null {
  let total: DiffLineCounts | null = null;
  for (const patch of patches) {
    const counts = patchLineCounts(patch);
    if (!counts) continue;
    total ??= { additions: 0, deletions: 0 };
    total.additions += counts.additions; total.deletions += counts.deletions;
  }
  return total;
}

import type { ChangeEntry } from "@shared/appTypes";

export const countDiffLines = (diff: string, prefix: string): number =>
  diff
    .split("\n")
    .filter((line) => line.startsWith(prefix) && !line.startsWith(prefix.repeat(3)))
    .length;

export const mapCommitChangeStatus = (status: string): string => {
  const code = status.trim().charAt(0).toUpperCase();
  switch (code) {
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    default:
      return "modified";
  }
};

export const summarizeChanges = (changes: ChangeEntry[]): { additions: number; deletions: number } =>
  changes.reduce(
    (summary, change) => ({
      additions: summary.additions + change.additions,
      deletions: summary.deletions + change.deletions
    }),
    { additions: 0, deletions: 0 }
  );

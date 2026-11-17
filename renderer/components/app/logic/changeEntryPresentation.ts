import type { ChangeEntry } from "@shared/appTypes";

/** Single-letter git status shown beside a changed file. */
export function changeGlyph(status: ChangeEntry["status"]): string {
  switch (status) {
    case "added": return "A";
    case "deleted": return "D";
    case "modified": return "M";
    case "renamed": return "R";
    case "copied": return "C";
    default: return status.trim() === "??" ? "U" : "*";
  }
}

export function changeTone(status: ChangeEntry["status"]): string {
  switch (status) {
    case "added": return "text-emerald-500";
    case "deleted": return "text-destructive";
    case "modified": return "text-primary";
    case "renamed":
    case "copied": return "text-amber-500";
    default: return "text-muted-foreground";
  }
}

/** Deleted files and renames have nothing editable at their listed path. */
export function canEditChange(change: ChangeEntry): boolean {
  return change.status !== "deleted" && !change.path.includes(" -> ");
}

export function isUntrackedChange(change: ChangeEntry): boolean {
  return change.status.trim() === "??";
}

/** Splits a path so rows can lead with the file name and keep the folder secondary. */
export function splitChangePath(path: string): { name: string; directory: string } {
  const target = path.includes(" -> ") ? path.split(" -> ").at(-1) ?? path : path;
  const index = target.lastIndexOf("/");
  return index < 0 ? { name: target, directory: "" } : { name: target.slice(index + 1), directory: target.slice(0, index) };
}

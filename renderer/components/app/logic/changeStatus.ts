const TONES: Record<string, string> = {
  added: "border-green-500/30 text-green-700 dark:text-green-400",
  untracked: "border-green-500/30 text-green-700 dark:text-green-400",
  deleted: "border-red-500/30 text-red-600 dark:text-red-400",
  renamed: "border-amber-500/30 text-amber-700 dark:text-amber-400",
  copied: "border-amber-500/30 text-amber-700 dark:text-amber-400"
};

/** Badge colours for a Git change status; modified and unknown statuses stay neutral. */
export function changeStatusTone(status: string): string {
  return TONES[status] ?? "border-border text-muted-foreground";
}

export function changeStatusLabel(status: string): string {
  return status ? status[0].toUpperCase() + status.slice(1) : "Changed";
}

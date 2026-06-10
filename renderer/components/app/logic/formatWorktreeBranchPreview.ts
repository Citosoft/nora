export function slugifyWorktreeBranchSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

export function formatWorktreeBranchPreview(prefix: string, name: string): string {
  const slug = slugifyWorktreeBranchSegment(name.trim()) || "agent";
  return `${(prefix.trim() || "feature")}/${slug}`;
}

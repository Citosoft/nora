export function normalizeWorkspaceRelativePath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function isWorkspaceNoteMarkdownPath(relativePath: string): boolean {
  return /^\.nora\/notes\/.+\.(md|markdown)$/i.test(normalizeWorkspaceRelativePath(relativePath));
}

export function isWorkspaceSpecMarkdownPath(relativePath: string): boolean {
  return /^\.nora\/specs\/.+\.(md|markdown)$/i.test(normalizeWorkspaceRelativePath(relativePath));
}

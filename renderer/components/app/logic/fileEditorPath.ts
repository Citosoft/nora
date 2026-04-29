export function buildFileEditorBreadcrumbs(pathName: string): string[] {
  const normalizedPath = pathName.replace(/\\/g, "/");
  return normalizedPath.split("/").filter((segment) => segment.length > 0);
}

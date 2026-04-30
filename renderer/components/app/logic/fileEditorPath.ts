export function buildFileEditorBreadcrumbs(pathName: string): string[] {
  const normalizedPath = pathName.replace(/\\/g, "/");
  return normalizedPath.split("/").filter((segment) => segment.length > 0);
}

export function getFileEditorLeafName(pathName: string): string {
  const breadcrumbs = buildFileEditorBreadcrumbs(pathName);
  return breadcrumbs[breadcrumbs.length - 1] || pathName;
}

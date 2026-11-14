/** Task IDs stay stable when Nora archives or reopens a task file. */
export function taskIdFromPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^.*?\.nora\/tasks\//, "").replace(/^completed\//, "").replace(/\.(md|markdown)$/i, "");
}

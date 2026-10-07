/** Last segment of a POSIX or Windows path, ignoring trailing separators; empty when there is none. */
export function getPathLeafName(pathValue: string | null | undefined): string {
  const segments = (pathValue ?? "").trim().replace(/\\/g, "/").split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

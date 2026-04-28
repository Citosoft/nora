type PathComparisonOptions = {
  windows: boolean;
};

export function normalizeComparablePath(value: string, options: PathComparisonOptions): string {
  return options.windows
    ? value.replace(/\//g, "\\").replace(/[\\]+$/, "").toLowerCase()
    : value.replace(/[\\/]+$/, "");
}

export function isPathWithinComparableRoot(
  candidatePath: string,
  rootPath: string,
  options: PathComparisonOptions
): boolean {
  const normalizedCandidate = normalizeComparablePath(candidatePath, options);
  const normalizedRoot = normalizeComparablePath(rootPath, options);
  const separator = options.windows ? "\\" : "/";
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}${separator}`);
}

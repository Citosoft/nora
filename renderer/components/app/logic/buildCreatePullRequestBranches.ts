export function buildCreatePullRequestBranches(activeBranch: string, projectBranches: string[], baseBranch: string): string[] {
  return [...new Set([activeBranch, ...projectBranches, baseBranch].map((branch) => branch.trim()).filter(Boolean))];
}

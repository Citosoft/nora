function getGitErrorText(error: Error): string {
  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";
  return `${error.message}\n${stderr}`.toLowerCase();
}

export function isMissingGitWorktreeError(error: Error): boolean {
  return /fatal:.*is not a working tree/.test(getGitErrorText(error));
}

export async function removeGitWorktreeIfRegistered<Result>(removeWorktree: () => Promise<Result>): Promise<void> {
  try {
    await removeWorktree();
  } catch (error) {
    if (error instanceof Error && isMissingGitWorktreeError(error)) {
      return;
    }
    throw error;
  }
}

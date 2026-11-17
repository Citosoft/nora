export interface WorktreeCheckoutSyncDeps {
  /** Re-registers a project's worktrees as checkouts; absent runtime work resolves without doing anything. */
  sync(projectId: string): Promise<void>;
  onError(error: unknown): void;
}

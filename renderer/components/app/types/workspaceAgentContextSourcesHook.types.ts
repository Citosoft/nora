export type UseWorkspaceAgentContextSourcesOptions = {
  /** When false, skips IPC and clears sources (default true). */
  enabled?: boolean;
  /** Increment to force a refetch without changing `projectId`. */
  reloadToken?: number;
};

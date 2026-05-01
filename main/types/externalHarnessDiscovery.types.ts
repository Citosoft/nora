/** Minimal harness session row before enrichment (counts, previews from transcript read). */
export interface ExternalHarnessArtifactCandidate {
  toolId: string;
  conversationId: string;
  primaryArtifactPath: string;
  sessionLabel: string;
  lastUpdatedAt: string | null;
}

export interface ExternalHarnessDiscoveryAdapter {
  readonly toolId: string;
  discoverExternalHarnessCandidates(
    workspaceAbsolutePath: string,
    occupiedKeys: Set<string>
  ): Promise<ExternalHarnessArtifactCandidate[]>;
}

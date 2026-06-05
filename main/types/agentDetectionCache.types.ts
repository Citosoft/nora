import type { AgentDetectionInfo } from "@shared/appTypes";

export type AgentDetectionResolveOptions = {
  force?: boolean;
};

export type RefreshCatalogOptions = {
  force?: boolean;
  awaitDetection?: boolean;
  awaitWorkspaceSummaries?: boolean;
};

export type LocalAgentDetectionCacheState = {
  cachedDetections: AgentDetectionInfo[] | null;
  inFlightDetection: Promise<AgentDetectionInfo[]> | null;
};

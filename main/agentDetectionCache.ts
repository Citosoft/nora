import type { AgentDetectionInfo } from "@shared/appTypes";
import type { AgentDetectionResolveOptions, LocalAgentDetectionCacheState } from "./types/agentDetectionCache.types";

const cacheState: LocalAgentDetectionCacheState = {
  cachedDetections: null,
  inFlightDetection: null
};

export function peekLocalAgentCatalogDetections(): AgentDetectionInfo[] | null {
  return cacheState.cachedDetections;
}

export function isLocalAgentDetectionInFlight(): boolean {
  return cacheState.inFlightDetection !== null;
}

export function invalidateLocalAgentDetectionCache(): void {
  cacheState.cachedDetections = null;
  cacheState.inFlightDetection = null;
}

export function resolveLocalAgentCatalogDetections(
  detect: () => Promise<AgentDetectionInfo[]>,
  options: AgentDetectionResolveOptions = {}
): Promise<AgentDetectionInfo[]> {
  if (!options.force && cacheState.cachedDetections) {
    return Promise.resolve(cacheState.cachedDetections);
  }

  if (!options.force && cacheState.inFlightDetection) {
    return cacheState.inFlightDetection;
  }

  const detectionPromise = detect()
    .then((detections) => {
      cacheState.cachedDetections = detections;
      return detections;
    })
    .finally(() => {
      if (cacheState.inFlightDetection === detectionPromise) {
        cacheState.inFlightDetection = null;
      }
    });

  cacheState.inFlightDetection = detectionPromise;
  return detectionPromise;
}

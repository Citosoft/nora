import { appStateFromAppDomainState } from "./appStateFromAppDomainState";
import { hydrateAppDomainState } from "./hydrateAppDomainState";
import type { AppState } from "@shared/appTypes";
import type { AppStateProjection } from "@/components/app/types/appStateProjection.types";

// Snapshots are immutable. Share normalization between ingress and React consumers,
// including consumers receiving the canonical snapshot returned by ingress.
const projections = new WeakMap<AppState, AppStateProjection>();

export function projectAppState(raw: AppState): AppStateProjection {
  const cached = projections.get(raw);
  if (cached) return cached;
  const domainState = hydrateAppDomainState(raw);
  const snapshot = appStateFromAppDomainState(domainState);
  const projection = { snapshot, domainState };
  projections.set(raw, projection);
  projections.set(snapshot, projection);
  return projection;
}

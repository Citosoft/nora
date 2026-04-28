import { appStateFromAppDomainState } from "@/components/app/logic/appStateFromAppDomainState";
import { hydrateAppDomainState } from "@/components/app/logic/hydrateAppDomainState";
import type { AppState } from "@shared/appTypes";

/** Single normalization pipeline for every main→renderer snapshot (compact streams + nested reconcile). */
export function canonicalizeAppStateFromMain(raw: AppState): AppState {
  return appStateFromAppDomainState(hydrateAppDomainState(raw));
}

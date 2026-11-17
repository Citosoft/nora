import { projectAppState } from "./projectAppState";
import type { AppState } from "@shared/appTypes";

/** Single normalization pipeline for every main→renderer snapshot (compact streams + nested reconcile). */
export function canonicalizeAppStateFromMain(raw: AppState): AppState {
  return projectAppState(raw).snapshot;
}

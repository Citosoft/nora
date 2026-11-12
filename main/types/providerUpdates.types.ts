import type { AgentDefinition } from "./internal.types";
import type { AgentDetectionInfo } from "@shared/appTypes";
import type { ProviderUpdateNotice } from "@shared/types/provider/update.types";

/** Resolves a version string, or `null` when it cannot be determined (offline, timeout, unparseable output). */
export type ResolveVersion = (subject: string) => Promise<string | null>;

export interface ProviderUpdateCheckerDeps {
  definitions: readonly Pick<AgentDefinition, "id" | "label" | "npmPackage">[];
  /** Reads the installed version from the detected executable path. */
  readInstalledVersion: ResolveVersion;
  /** Reads the newest published version for an npm package name. */
  fetchLatestVersion: ResolveVersion;
}

export type CheckProviderUpdates = (detections: readonly AgentDetectionInfo[]) => Promise<ProviderUpdateNotice[]>;

export type FetchJson = (url: string, init: { signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

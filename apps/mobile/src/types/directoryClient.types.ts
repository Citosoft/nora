import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { FetchLike, TokenProvider } from "./http.types";

export interface DirectoryClientConfig {
  baseUrl: string;
  getToken: TokenProvider;
  fetch: FetchLike;
  timeoutMs: number;
}

/** The control-plane Worker's runtime directory: discovery and housekeeping only, never conversation traffic. */
export interface DirectoryClient {
  list(): Promise<RuntimeDirectoryEntry[]>;
  rename(installationId: string, name: string): Promise<RuntimeDirectoryEntry>;
  /** Unlinks the computer from the account; it stops being reachable from the web app until re-enabled. */
  remove(installationId: string): Promise<void>;
}

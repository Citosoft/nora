import type { FetchLike, TokenProvider } from "./http.types";

/** Client-observed reachability of one runtime; registration in the directory never implies online. */
export type RuntimeReachability =
  | { status: "checking" }
  | { status: "online"; apiVersion: number; compatible: boolean; checkedAt: string }
  | { status: "offline"; reason: OfflineReason; checkedAt: string };

export type OfflineReason = "timeout" | "unreachable" | "unavailable" | "unexpected-reply";

export interface ProbeOptions {
  hostname: string;
  fetch: FetchLike;
  getToken: TokenProvider;
  timeoutMs: number;
  now: () => Date;
}

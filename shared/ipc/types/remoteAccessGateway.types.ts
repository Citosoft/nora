import type { RemoteAccessRequest, RemoteAccessView, RemoteAuditEntry } from "@shared/types/remote-access/remoteAccess.types";

/** Requests that change or read remote access and answer with the whole view. */
export type RemoteAccessViewRequest = Exclude<RemoteAccessRequest, { kind: "activity" }>;
export interface RemoteAccessBridge {
  request(input: RemoteAccessViewRequest): Promise<RemoteAccessView>;
  /** Most recent remote commands and decisions recorded by this computer's audit log, newest first. */
  activity(limit?: number): Promise<RemoteAuditEntry[]>;
  /** Called with the whole view whenever remote access status changes; returns an unsubscribe function. */
  onChanged(listener: (view: RemoteAccessView) => void): () => void;
}

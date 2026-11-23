import type { RemoteAccessView, RemoteAuditEntry } from "@shared/types/remote-access/remoteAccess.types";

/** The desktop remote access coordinator as seen by IPC, lifecycle and tray wiring. */
export interface RemoteAccessService {
  /** Restores a previous opted-in state on app launch; never throws. */
  start(): Promise<void>;
  enable(): Promise<RemoteAccessView>;
  /** Stops the connector and server immediately (works offline), then unregisters best-effort. */
  disable(): Promise<RemoteAccessView>;
  retry(): Promise<RemoteAccessView>;
  rename(name: string): Promise<RemoteAccessView>;
  rotate(): Promise<RemoteAccessView>;
  /** Closes one device's connections and refuses its sign-in until that device signs in again. */
  disconnectDevice(deviceId: string): Promise<RemoteAccessView>;
  view(): RemoteAccessView;
  /** Whether the user opted in (even while paused or failing). */
  isEnabled(): boolean;
  activity(limit: number): Promise<RemoteAuditEntry[]>;
  subscribe(listener: (view: RemoteAccessView) => void): () => void;
  /** Called whenever the signed-in Clerk session changes. */
  sessionChanged(): void;
  /** Stops the connector and server gracefully; part of the app shutdown sequence. */
  shutdown(): Promise<void>;
}

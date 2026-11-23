import type { RemoteDevice } from "@shared/types/remote-access/remoteAccess.types";
import type { RemoteIdentity } from "./auth.types";

/** What the runtime transport reports as phones reach it. */
export interface RemotePresenceRecorder {
  /** An authenticated request arrived from this session. */
  seen(identity: RemoteIdentity, label: string | null): void;
  /** A realtime socket opened for this session; `close` ends it if the device is disconnected. Call the returned function once it closes. */
  connect(identity: RemoteIdentity, close: () => void): () => void;
  /** Whether the owner disconnected this session. */
  revoked(sessionId: string): boolean;
}

/** The in-memory list of devices the coordinator shows; cleared when remote access stops or the account changes. */
export interface RemotePresence extends RemotePresenceRecorder {
  devices(): RemoteDevice[];
  /** Forgets every device and closes its connections, without notifying; the caller reports the change with its own update. */
  clear(): void;
  /** Closes the device's live connections and drops it from the list, without notifying. */
  disconnect(sessionId: string): void;
}

export interface RemotePresenceOptions {
  now(): number;
  /** Called when the device list changes in a way worth showing. */
  onChanged(): void;
  /** The coordinator's saved list of disconnected sessions is the one source of truth. */
  revoked(sessionId: string): boolean;
}

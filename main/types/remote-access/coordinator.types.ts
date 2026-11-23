import type { RuntimeEnvironment } from "@shared/types/remote-access/directory.types";
import type { AccountSession } from "@main/types/account/session.types";
import type { RemoteStateStore } from "./store.types";
import type { RemoteControlPlane } from "./controlPlane.types";
import type { RemoteConnector } from "./connector/connector.types";
import type { RuntimeServer } from "./http/runtime.types";
import type { RemoteIdentity } from "./auth.types";
import type { RemotePresenceRecorder } from "./presence.types";
import type { RemoteAccessView, RemoteAuditEntry } from "@shared/types/remote-access/remoteAccess.types";

export interface RemoteCoordinatorOptions {
  store: RemoteStateStore;
  environment: RuntimeEnvironment;
  control: RemoteControlPlane;
  connector: RemoteConnector;
  session(): AccountSession | null;
  startServer(port: number | null, permits: (identity: RemoteIdentity) => boolean, presence: RemotePresenceRecorder): Promise<RuntimeServer>;
  /** Clock for the device list; defaults to the system clock. */
  now?(): number;
  activity(limit: number): Promise<RemoteAuditEntry[]>;
  onChanged(view: RemoteAccessView): void;
  close(): void;
}

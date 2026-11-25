import type { DirectoryClient } from "./directoryClient.types";
import type { PushRegistration } from "./pushNotifications.types";
import type { TokenProvider } from "./http.types";
import type { CommandFactoryDeps, PendingCommandStore } from "./pendingCommand.types";
import type { RuntimeReachability } from "./reachability.types";
import type { RuntimeSessionRegistry } from "./runtimeSession.types";

/** Signed-in services shared by every screen; rebuilt when the Clerk user changes. */
export interface RemoteAccessServices {
  userId: string;
  getToken: TokenProvider;
  directory: DirectoryClient;
  sessions: RuntimeSessionRegistry;
  pendingCommands: PendingCommandStore;
  commandDeps: CommandFactoryDeps;
  probe(hostname: string): Promise<RuntimeReachability>;
  recordConnected(installationId: string, at: Date): void;
  /** This phone's push registration; null in demo mode, which must never register. */
  push: PushRegistration | null;
  /** Unregisters this phone from push, then forgets this account's device data (cached runtimes, unsent commands) and closes connections before sign-out. */
  forgetDeviceData(): Promise<void>;
}

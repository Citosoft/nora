import type { FetchLike, TokenProvider } from "@/types/http.types";
import type { PreferencesStore } from "@/types/preferences.types";
import type { RemoteAccessServices } from "@/types/remoteAccess.types";
import type { KeyValueStorage } from "@/types/storage.types";
import type { PushNotificationsPlatform } from "@/types/pushNotifications.types";
import { createPushDeviceStore } from "@/push/pushDeviceStore";
import { createPushRegistration } from "@/push/pushRegistration";
import { createDirectoryClient } from "@/api/directory/directoryClient";
import { createRuntimeClient } from "@/api/runtime/runtimeClient";
import { createPendingCommandStore } from "@/commands/pendingCommandStore";
import { REQUEST_TIMEOUTS } from "@/config/timeouts";
import { probeRuntime } from "@/reachability/probeRuntime";
import { createRealtimeConnection } from "@/realtime/realtimeConnection";
import { createWebSocket, scheduleTimer } from "@/realtime/webSocketFactory";
import { createRuntimeSession } from "./runtimeSession";
import { createRuntimeSessionRegistry } from "./runtimeSessionRegistry";
import { describeThisDevice } from "@/platform/clientLabel";

export interface RemoteAccessServicesDeps {
  userId: string;
  getToken: TokenProvider;
  controlPlaneUrl: string;
  storage: KeyValueStorage;
  preferences: PreferencesStore;
  createId: () => string;
  pushNotifications: PushNotificationsPlatform;
}

/** Composition root for the signed-in app: every client, store and session is wired here and nowhere else. */
export function createRemoteAccessServices(deps: RemoteAccessServicesDeps): RemoteAccessServices {
  const fetchImpl: FetchLike = (input, init) => globalThis.fetch(input, init);
  const clientLabel = describeThisDevice();
  const now = () => new Date();
  const recordConnected = (installationId: string, at: Date): void => {
    void deps.preferences.update((current) => ({ ...current, lastConnected: { ...current.lastConnected, [installationId]: at.toISOString() } }));
  };
  const pendingCommands = createPendingCommandStore(deps.storage);
  void pendingCommands.load();
  const sessions = createRuntimeSessionRegistry((endpoint) => createRuntimeSession({
    runtimeId: endpoint.installationId,
    hostname: endpoint.hostname,
    client: createRuntimeClient({ hostname: endpoint.hostname, getToken: deps.getToken, fetch: fetchImpl,
      timeoutMs: REQUEST_TIMEOUTS.runtimeMs, commandTimeoutMs: REQUEST_TIMEOUTS.commandMs, clientLabel }),
    createConnection: (connectionDeps, listener) => createRealtimeConnection({
      ...connectionDeps, createSocket: createWebSocket, schedule: scheduleTimer, now: () => Date.now(), random: Math.random
    }, listener),
    onConnected: (at) => recordConnected(endpoint.installationId, at),
    now
  }));

  const directory = createDirectoryClient({ baseUrl: deps.controlPlaneUrl, getToken: deps.getToken, fetch: fetchImpl, timeoutMs: REQUEST_TIMEOUTS.directoryMs });
  const push = createPushRegistration({ userId: deps.userId, platform: deps.pushNotifications, directory,
    store: createPushDeviceStore({ storage: deps.storage, createId: deps.createId }) });

  return {
    userId: deps.userId,
    getToken: deps.getToken,
    directory,
    sessions,
    pendingCommands,
    commandDeps: { createId: deps.createId, now },
    probe: (hostname) => probeRuntime({ hostname, getToken: deps.getToken, fetch: fetchImpl, timeoutMs: REQUEST_TIMEOUTS.probeMs, now }),
    recordConnected,
    push,
    async forgetDeviceData() {
      // While the session token still works, so this account's computers stop notifying this phone.
      await push.unregister();
      sessions.disposeAll();
      await pendingCommands.clear();
      await deps.preferences.update((current) => ({ ...current, cachedRuntimes: null, lastConnected: {}, defaultRuntimeId: null }));
    }
  };
}

import { runtimeDirectoryEntrySchema } from "@shared/remote-access/directory";
import type { RemoteAccessServices } from "@/types/remoteAccess.types";
import type { PreferencesStore } from "@/types/preferences.types";
import type { KeyValueStorage } from "@/types/storage.types";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import { createPendingCommandStore } from "@/commands/pendingCommandStore";
import { createRuntimeSession } from "@/session/runtimeSession";
import { createRuntimeSessionRegistry } from "@/session/runtimeSessionRegistry";
import { RemoteRequestError } from "@/api/http/remoteRequestError";
import { createDemoRuntime } from "./runtime";
import { demoRuntimeId } from "./seed";

/** Separate composition root: no HTTP, WebSocket, Clerk token or persistent account storage is reachable here. */
export function createDemoServices(storage: KeyValueStorage, preferences: PreferencesStore, createId: () => string): RemoteAccessServices {
  const runtime = createDemoRuntime();
  let runtimes: RuntimeDirectoryEntry[] = [{ installationId: demoRuntimeId, name: "Demo Mac", environment: "desktop", hostname: "nora-demo.invalid", tunnelId: "demo-only", registeredAt: new Date().toISOString() }];
  const pendingCommands = createPendingCommandStore(storage);
  const sessions = createRuntimeSessionRegistry(endpoint => {
    if (endpoint.installationId !== demoRuntimeId || endpoint.hostname !== "nora-demo.invalid") throw new Error("Demo mode only supports its simulated computer.");
    return createRuntimeSession({ runtimeId: endpoint.installationId, hostname: endpoint.hostname, client: runtime.client, now: () => new Date(), onConnected: () => undefined,
      createConnection: (_deps, listener) => {
        let unsubscribe: (() => void) | null = null;
        let cursor = 0;
        return { start(after) { cursor = after; unsubscribe = runtime.subscribe(events => { cursor = events.at(-1)?.cursor ?? cursor; listener.onEvents(events); }); listener.onStatus({ kind: "live" }); },
          stop() { unsubscribe?.(); unsubscribe = null; }, resume() { listener.onStatus({ kind: "live" }); }, status: () => ({ kind: "live" }), cursor: () => cursor };
      }
    });
  });
  return { userId: "nora-demo", getToken: async () => null,
    directory: { list: async () => runtimeDirectoryEntrySchema.array().parse(runtimes), rename: async (id, name) => {
      const entry = runtimes.find(r => r.installationId === id);
      if (!entry) throw new RemoteRequestError("directory", { kind: "api", status: 404, code: "not-found", message: "Demo computer not found." });
      const updated = { ...entry, name }; runtimes = runtimes.map(r => r.installationId === id ? updated : r); return updated;
    }, remove: async id => { runtimes = runtimes.filter(r => r.installationId !== id); },
    registerPushDevice: async () => { throw new Error("Demo mode never registers for notifications."); },
    removePushDevice: async () => undefined },
    sessions: { get: endpoint => sessions.get(endpoint), resumeAll: () => sessions.resumeAll(), disposeAll() { sessions.disposeAll(); runtime.dispose(); } },
    pendingCommands, commandDeps: { createId, now: () => new Date() },
    probe: async () => ({ status: "online", apiVersion: 1, compatible: true, checkedAt: new Date().toISOString() }), recordConnected: () => undefined, push: null,
    async forgetDeviceData() { sessions.disposeAll(); runtime.dispose(); await pendingCommands.clear(); await preferences.update(current => ({ ...current, cachedRuntimes: null, lastConnected: {}, defaultRuntimeId: null })); }
  };
}

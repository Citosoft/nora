import type { AccountSession } from "@main/types/account/session.types";
import { createRemoteAccessService } from "@main/remote-access/service";
import type { RemoteState } from "@main/types/remote-access/store.types";
import type { RemoteControlPlane } from "@main/types/remote-access/controlPlane.types";
import type { RemoteIdentity } from "@main/types/remote-access/auth.types";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";

export function serviceFixture(initial?: RemoteState, overrides: Partial<RemoteControlPlane> = {}) {
  let session: AccountSession | null = { userId: "owner", sessionId: "session-a" };
  let saved: RemoteState = initial ?? { version: 1, installationId: "installation-123456", name: "Desktop", enabled: false,
    ownerId: null, port: null, runtime: null, connectorSecret: null, cleanup: [] };
  const runtime: RuntimeDirectoryEntry = { installationId: saved.installationId, name: "Desktop", environment: "desktop", hostname: "device.remote.withnora.run", tunnelId: "tunnel", registeredAt: "2026-11-16T10:00:00Z" };
  let provisioned = 0; let removed = 0; let started = 0; let serverClosed = 0; let connectorStopped = 0;
  let allowed = (_identity: RemoteIdentity): boolean => false;
  const service = createRemoteAccessService({ environment: "desktop", store: {
    async load() { return structuredClone(saved); }, async save(next) { saved = structuredClone(next); },
    encrypt: (token) => `encrypted:${token}`, decrypt: (secret) => secret.replace("encrypted:", "") },
    session: () => session,
    control: {
      async provision() { provisioned += 1; return { runtime, connectorToken: "connector-token" }; },
      async rename(_session, _id, name) { return { ...runtime, name }; },
      async rotate() { return { runtime, connectorToken: "rotated-token" }; },
      async remove() { removed += 1; }, ...overrides
    },
    connector: { async start(options) { started += 1; options.onStatus({ status: "connected" }); return { async stop() { connectorStopped += 1; } }; } },
    async startServer(_port, permits) { allowed = permits; return { port: 43210, async close() { serverClosed += 1; } }; },
    activity: async () => [], onChanged() {}, close() {}
  });
  return { service, runtime, state: () => saved, setSession(next: AccountSession | null) { session = next; },
    permits: () => allowed({ userId: "owner", sessionId: "remote-session", expiresAt: Date.now() + 60_000 }),
    counts: () => ({ provisioned, removed, started, serverClosed, connectorStopped }) };
}

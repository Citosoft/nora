import type { RemoteDevice } from "@shared/types/remote-access/remoteAccess.types";
import type { RemotePresence, RemotePresenceOptions } from "@main/types/remote-access/presence.types";

const MAX_DEVICES = 32;
/** Requests arrive every few seconds; a device's "last active" only needs to move once a minute. */
const LAST_SEEN_REPORT_MS = 60_000;

interface DeviceRecord { label: string | null; sockets: Set<() => void>; firstSeenAt: number; lastSeenAt: number; reportedSeenAt: number; }

/** Tracks account sessions that reach this computer, keyed by session id, so the desktop can list connected devices. */
export function createRemotePresence(options: RemotePresenceOptions): RemotePresence {
  const records = new Map<string, DeviceRecord>();
  const evict = (): void => {
    if (records.size <= MAX_DEVICES) return;
    const idle = [...records].filter(([, record]) => record.sockets.size === 0).sort(([, a], [, b]) => a.lastSeenAt - b.lastSeenAt);
    for (const [id] of idle.slice(0, records.size - MAX_DEVICES)) records.delete(id);
  };
  const touch = (sessionId: string, label: string | null): { record: DeviceRecord; changed: boolean } => {
    const at = options.now();
    const existing = records.get(sessionId);
    if (!existing) {
      const record: DeviceRecord = { label, sockets: new Set(), firstSeenAt: at, lastSeenAt: at, reportedSeenAt: at };
      records.set(sessionId, record); evict();
      return { record, changed: true };
    }
    // A socket upgrade carries no label, so keep the one its requests gave.
    const relabelled = label !== null && label !== existing.label;
    if (relabelled) existing.label = label;
    existing.lastSeenAt = at;
    const stale = at - existing.reportedSeenAt >= LAST_SEEN_REPORT_MS;
    if (relabelled || stale) existing.reportedSeenAt = at;
    return { record: existing, changed: relabelled || stale };
  };
  return {
    seen(identity, label) { if (touch(identity.sessionId, label).changed) options.onChanged(); },
    connect(identity, close) {
      const { record } = touch(identity.sessionId, null);
      // Each socket gets its own closer, so the same function passed twice still counts as two connections.
      const socket = (): void => close();
      record.sockets.add(socket); record.reportedSeenAt = record.lastSeenAt;
      options.onChanged();
      return () => {
        if (!record.sockets.delete(socket) || records.get(identity.sessionId) !== record) return;
        record.lastSeenAt = options.now(); record.reportedSeenAt = record.lastSeenAt;
        options.onChanged();
      };
    },
    revoked: (sessionId) => options.revoked(sessionId),
    disconnect(sessionId) {
      const record = records.get(sessionId);
      if (!record) return;
      records.delete(sessionId);
      for (const close of record.sockets) close();
    },
    devices(): RemoteDevice[] {
      return [...records].map(([id, record]) => ({ id, label: record.label, connected: record.sockets.size > 0,
        firstSeenAt: new Date(record.firstSeenAt).toISOString(), lastSeenAt: new Date(record.reportedSeenAt).toISOString() }))
        .sort((a, b) => Number(b.connected) - Number(a.connected) || b.lastSeenAt.localeCompare(a.lastSeenAt));
    },
    clear() { const all = [...records.values()]; records.clear(); for (const record of all) for (const close of record.sockets) close(); }
  };
}

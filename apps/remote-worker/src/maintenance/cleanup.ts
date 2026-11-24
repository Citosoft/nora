import { RELAY_RETENTION } from "@shared/remote-access/constants";
import type { AccountDirectory, CleanupDeps, CleanupResult } from "../types/cleanup.types";
import type { TunnelInspection } from "../types/cloudflare.types";
import { tunnelNameFor } from "../provisioning/tunnels";

/** Connection activity is the heartbeat. Missing activity data never authorizes deletion. */
function expired(tunnel: TunnelInspection, registeredAt: string | null, now: number): boolean {
  if (tunnel.deleted) return true;
  if (tunnel.status !== "inactive" && tunnel.status !== "down") return false;
  const since = tunnel.status === "inactive" ? tunnel.createdAt : tunnel.disconnectedAt;
  if (since === null || tunnel.createdAt === null) return false;
  const lastActivity = Math.max(Date.parse(since), Date.parse(tunnel.createdAt), registeredAt === null ? 0 : Date.parse(registeredAt));
  return now - lastActivity >= (registeredAt === null ? RELAY_RETENTION.orphanGraceMs : RELAY_RETENTION.runtimeExpiryMs);
}

/** Both sides of a deterministic name may contain hyphens; resolve against actual accounts, never split the name. */
function ownersFor(tunnel: TunnelInspection, accounts: readonly AccountDirectory[]): readonly AccountDirectory[] {
  return accounts.filter(({ userId, directory }) => tunnel.name.startsWith(`nora-${userId}-`)
    || directory.entries.some((entry) => entry.tunnelId === tunnel.id));
}

export async function cleanupTunnels(deps: CleanupDeps): Promise<CleanupResult> {
  const accounts = await deps.inventory();
  const tunnels = await deps.tunnels.listForCleanup();
  const result: CleanupResult = { scanned: tunnels.length, removed: 0, failed: 0 };
  for (const candidate of tunnels) {
    if (!candidate.name.startsWith("nora-")) continue;
    try {
      const owners = ownersFor(candidate, accounts);
      // An ambiguous name or malformed metadata cannot establish that a tunnel is abandoned.
      if (owners.length > 1) continue;
      const owner = owners[0];
      const directory = owner ? await deps.store.read(owner.userId) : null;
      if (directory?.malformed || directory?.invalidKeys.length) continue;
      const entry = directory?.entries.find((item) => item.tunnelId === candidate.id);
      if (entry && owner && tunnelNameFor(owner.userId, entry.installationId) !== candidate.name) continue;
      // A new registration with this name may still be starting its connector. Preserve it.
      if (!entry && owner && directory?.entries.some((item) => tunnelNameFor(owner.userId, item.installationId) === candidate.name)) {
        // Deleted predecessors still need DNS cleanup, but must never remove the replacement's metadata.
        if (!candidate.deleted) continue;
      }
      if (!expired(candidate, entry?.registeredAt ?? null, deps.now())) continue;
      // Some API responses return 404 for soft-deleted resources; the deleted inventory entry is enough
      // to finish DNS/directory cleanup, without authorizing deletion of a live tunnel.
      const current = await deps.tunnels.inspect(candidate.id) ?? (candidate.deleted ? candidate : null);
      if (current === null || current.name !== candidate.name || !expired(current, entry?.registeredAt ?? null, deps.now())) continue;
      // Never force-drop connections here: Cloudflare must reject deletion if a connector has just returned.
      if (!current.deleted) await deps.tunnels.deleteTunnel(current.id);
      await deps.tunnels.deleteTunnelDns(current.id, deps.hostnameSuffix);
      if (entry && owner) {
        const latest = await deps.store.read(owner.userId);
        if (latest.entries.some((item) => item.installationId === entry.installationId && item.tunnelId === current.id)) {
          await deps.store.remove(owner.userId, entry.installationId);
        }
      }
      if (!candidate.deleted) result.removed += 1;
    } catch {
      result.failed += 1; // Continue other installations; the next scheduled run retries partial cleanup.
    }
  }
  return result;
}

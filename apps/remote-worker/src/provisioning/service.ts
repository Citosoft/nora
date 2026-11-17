import type {
  ProvisionRuntimeRequest,
  ProvisionRuntimeResponse,
  RuntimeDirectoryEntry
} from "@shared/types/remote-access/directory.types";
import { DirectoryFailure } from "../errors/directoryFailure";
import { deriveRuntimeHostname } from "../hostname";
import type { CloudflareTunnel } from "../types/cloudflare.types";
import type { ProvisioningService, ProvisioningServiceDeps } from "../types/provisioning.types";
import { compareByRegistration, directorySizeBytes, exceedsQuota, MAX_DIRECTORY_BYTES } from "./quota";
import { ensureTunnel, newTunnelSecret, teardownRuntime, tunnelCnameTarget, tunnelNameFor } from "./tunnels";

const NOT_FOUND_MESSAGE = "Runtime not found.";
/** Worst-case tunnel ID length allowed by the directory schema, used for the size pre-check. */
const LONGEST_TUNNEL_ID = "0".repeat(64);

export function createProvisioningService(deps: ProvisioningServiceDeps): ProvisioningService {
  const { store, tunnels, clock, random } = deps;

  /** Lookups are scoped to the caller's own directory, so another user's installation ID is simply "not found". */
  async function requireOwnEntry(userId: string, installationId: string): Promise<RuntimeDirectoryEntry> {
    const { entries } = await store.read(userId);
    const entry = entries.find((candidate) => candidate.installationId === installationId);
    if (entry === undefined) throw new DirectoryFailure("not-found", NOT_FOUND_MESSAGE);
    return entry;
  }

  async function provision(userId: string, request: ProvisionRuntimeRequest): Promise<ProvisionRuntimeResponse> {
    const { installationId } = request;
    const snapshot = await store.read(userId);
    const existing = snapshot.entries.find((entry) => entry.installationId === installationId) ?? null;
    if (existing === null && snapshot.entries.length >= deps.maxRuntimesPerUser) {
      throw new DirectoryFailure("quota", `At most ${deps.maxRuntimesPerUser} runtimes can be linked to an account.`);
    }

    const hostname = await deriveRuntimeHostname(deps.hostnameSecret, deps.hostnameSuffix, userId, installationId);
    // Re-provisioning keeps the original registration time; only the name, environment and port can change.
    const registeredAt = existing?.registeredAt ?? clock.now().toISOString();
    const buildEntry = (tunnelId: string): RuntimeDirectoryEntry => ({
      installationId,
      name: request.name,
      environment: request.environment,
      hostname,
      tunnelId,
      registeredAt
    });
    const others = snapshot.entries.filter((candidate) => candidate.installationId !== installationId);
    if (directorySizeBytes([...others, buildEntry(LONGEST_TUNNEL_ID)]) > MAX_DIRECTORY_BYTES) {
      throw new DirectoryFailure("quota", "The runtime directory for this account is full.");
    }

    const resolved = await ensureTunnel(tunnels, random, {
      knownTunnelId: existing?.tunnelId ?? null,
      tunnelName: tunnelNameFor(userId, installationId)
    });
    const finalEntry = buildEntry(resolved.tunnel.id);

    let createdDnsRecord = false;
    try {
      await tunnels.putIngress(resolved.tunnel.id, { hostname, port: request.port });
      createdDnsRecord = (await tunnels.upsertCname(hostname, tunnelCnameTarget(resolved.tunnel.id))).created;
      // A key that holds a malformed value would deep-merge with the new entry, so clear it first.
      if (snapshot.invalidKeys.includes(installationId)) await store.remove(userId, installationId);
      await store.put(userId, finalEntry);
    } catch (error) {
      if (resolved.created) {
        await bestEffort(() => teardownNewResources(resolved.tunnel, hostname, createdDnsRecord));
      }
      throw error;
    }

    if (existing === null) await enforceQuotaAfterWrite(userId, finalEntry);

    const connectorToken = await tunnels.getTunnelToken(resolved.tunnel.id);
    return { runtime: finalEntry, connectorToken };
  }

  async function teardownNewResources(tunnel: CloudflareTunnel, hostname: string, dnsCreated: boolean): Promise<void> {
    await tunnels.deleteTunnel(tunnel.id);
    if (dnsCreated) await tunnels.deleteCname(hostname);
  }

  /**
   * The pre-check is racy (Clerk metadata is not transactional), so after adding a new entry the directory is re-read.
   * If this installation landed beyond the quota it removes only its own entry and resources, then reports `quota`.
   */
  async function enforceQuotaAfterWrite(userId: string, entry: RuntimeDirectoryEntry): Promise<void> {
    const { entries } = await store.read(userId);
    if (!exceedsQuota(entries, entry.installationId, deps.maxRuntimesPerUser)) return;
    await store.remove(userId, entry.installationId);
    await bestEffort(() => teardownRuntime(tunnels, entry));
    throw new DirectoryFailure("quota", `At most ${deps.maxRuntimesPerUser} runtimes can be linked to an account.`);
  }

  return {
    provision,

    async list(userId) {
      const { entries } = await store.read(userId);
      return [...entries].sort(compareByRegistration);
    },

    async rename(userId, installationId, name) {
      const entry = await requireOwnEntry(userId, installationId);
      const renamed: RuntimeDirectoryEntry = { ...entry, name };
      await store.put(userId, renamed);
      return renamed;
    },

    async remove(userId, installationId) {
      // Cloud identifiers come only from the caller's own stored entry, never from the request.
      const entry = await requireOwnEntry(userId, installationId);
      await teardownRuntime(tunnels, entry);
      await store.remove(userId, installationId);
    },

    async rotate(userId, installationId) {
      const entry = await requireOwnEntry(userId, installationId);
      const tunnel = await tunnels.getTunnel(entry.tunnelId);
      if (tunnel === null) {
        throw new DirectoryFailure("conflict", "The runtime's tunnel no longer exists; provision the runtime again.");
      }
      await tunnels.updateTunnelSecret(tunnel.id, newTunnelSecret(random));
      await tunnels.deleteTunnelConnections(tunnel.id);
      const connectorToken = await tunnels.getTunnelToken(tunnel.id);
      return { runtime: entry, connectorToken };
    }
  };
}

/** Cleanup must never mask the original outcome; leftovers stay recoverable through the deterministic tunnel name. */
async function bestEffort(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    // Intentionally swallowed: see doc comment.
  }
}

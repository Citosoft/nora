import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import { UpstreamError } from "../errors/upstreamError";
import type { TunnelProvider } from "../types/cloudflare.types";
import type { EnsuredTunnel, EnsureTunnelRequest, RandomSource } from "../types/provisioning.types";

/** Cloudflare requires a base64 secret of at least 32 bytes. */
const TUNNEL_SECRET_BYTES = 32;

export function tunnelNameFor(userId: string, installationId: string): string {
  return `nora-${userId}-${installationId}`;
}

export function tunnelCnameTarget(tunnelId: string): string {
  return `${tunnelId}.cfargotunnel.com`;
}

export function newTunnelSecret(random: RandomSource): string {
  let binary = "";
  for (const byte of random.bytes(TUNNEL_SECRET_BYTES)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Finds the runtime's live tunnel or creates one, repairing partial failures:
 * 1. the tunnel recorded in the directory, if it still exists;
 * 2. otherwise a tunnel with the deterministic name (left behind when a metadata write failed);
 * 3. otherwise a new remotely-managed tunnel. A failed create is re-checked by name to absorb concurrent provisions.
 */
export async function ensureTunnel(
  tunnels: TunnelProvider,
  random: RandomSource,
  request: EnsureTunnelRequest
): Promise<EnsuredTunnel> {
  if (request.knownTunnelId !== null) {
    const known = await tunnels.getTunnel(request.knownTunnelId);
    if (known !== null) return { tunnel: known, created: false };
  }
  const named = await tunnels.findTunnelByName(request.tunnelName);
  if (named !== null) return { tunnel: named, created: false };

  try {
    return { tunnel: await tunnels.createTunnel(request.tunnelName, newTunnelSecret(random)), created: true };
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error;
    const raced = await tunnels.findTunnelByName(request.tunnelName);
    if (raced === null) throw error;
    return { tunnel: raced, created: false };
  }
}

/**
 * Removes a runtime's Cloudflare resources using identifiers from the owner's directory entry. Connections are
 * dropped first because Cloudflare refuses to delete a tunnel with active connections. Missing resources are fine.
 */
export async function teardownRuntime(tunnels: TunnelProvider, entry: RuntimeDirectoryEntry): Promise<void> {
  await tunnels.deleteTunnelConnections(entry.tunnelId);
  await tunnels.deleteTunnel(entry.tunnelId);
  await tunnels.deleteCname(entry.hostname);
}

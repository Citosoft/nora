import { describe, expect, it, vi } from "vitest";
import { cleanupTunnels } from "../src/maintenance/cleanup";
import type { AccountDirectory, CleanupDeps } from "../src/types/cleanup.types";
import type { RuntimeDirectorySnapshot } from "../src/types/directoryStore.types";
import type { TunnelInspection } from "../src/types/cloudflare.types";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";

const now = Date.parse("2026-11-24T12:00:00Z");
const daysAgo = (days: number) => new Date(now - days * 86400000).toISOString();
const entry: RuntimeDirectoryEntry = { installationId: "installation-123456", name: "Mac", environment: "desktop",
  hostname: "a".repeat(32) + ".withnora.run", tunnelId: "old", registeredAt: daysAgo(120) };
const tunnel: TunnelInspection = { id: "old", name: "nora-user_1-installation-123456", status: "down",
  createdAt: daysAgo(120), disconnectedAt: daysAgo(91), deleted: false };

function fixture(registered = true, overrides: Partial<TunnelInspection> = {}) {
  const candidate = { ...tunnel, ...overrides };
  const snapshot: RuntimeDirectorySnapshot = { entries: registered ? [entry] : [], invalidKeys: [] };
  const accounts: AccountDirectory[] = [{ userId: "user_1", directory: snapshot }];
  const inventory = vi.fn(async () => accounts);
  const read = vi.fn(async () => snapshot);
  const remove = vi.fn(async () => {});
  const inspect = vi.fn(async (): Promise<TunnelInspection | null> => candidate);
  const deleteTunnel = vi.fn(async () => {});
  const deleteTunnelDns = vi.fn(async () => {});
  const deps: CleanupDeps = { inventory, store: { read, remove, put: async () => {} },
    tunnels: { listForCleanup: async () => [candidate], inspect, deleteTunnel, deleteTunnelDns },
    now: () => now, hostnameSuffix: "withnora.run" };
  return { deps, inventory, read, remove, inspect, deleteTunnel, deleteTunnelDns };
}

describe("relay cleanup", () => {
  it("expires registered installations after 90 days disconnected", async () => {
    const f = fixture();
    expect(await cleanupTunnels(f.deps)).toEqual({ scanned: 1, removed: 1, failed: 0 });
    expect(f.deleteTunnel).toHaveBeenCalledWith("old");
    expect(f.deleteTunnelDns).toHaveBeenCalledWith("old", "withnora.run");
    expect(f.remove).toHaveBeenCalledWith("user_1", entry.installationId);
  });

  it("uses a seven-day grace period for orphans", async () => {
    const young = fixture(false, { disconnectedAt: daysAgo(6) });
    await cleanupTunnels(young.deps);
    expect(young.deleteTunnel).not.toHaveBeenCalled();
    const old = fixture(false, { disconnectedAt: daysAgo(8) });
    await cleanupTunnels(old.deps);
    expect(old.deleteTunnel).toHaveBeenCalledOnce();
    expect(old.remove).not.toHaveBeenCalled();
  });

  it.each([
    { status: "healthy" as const }, { status: "degraded" as const }, { status: null },
    { disconnectedAt: daysAgo(89) }, { disconnectedAt: null }, { createdAt: null },
    { name: "another-product" }
  ])("preserves active, recent, unknown or unrelated tunnels: %j", async (override) => {
    const f = fixture(true, override);
    await cleanupTunnels(f.deps);
    expect(f.deleteTunnel).not.toHaveBeenCalled();
  });

  it("expires never-connected tunnels from creation time", async () => {
    const f = fixture(false, { status: "inactive", disconnectedAt: null, createdAt: daysAgo(8) });
    await cleanupTunnels(f.deps);
    expect(f.deleteTunnel).toHaveBeenCalledOnce();
  });

  it("preserves a new registration for an old tunnel", async () => {
    const f = fixture();
    f.read.mockResolvedValue({ entries: [{ ...entry, registeredAt: daysAgo(1) }], invalidKeys: [] });
    await cleanupTunnels(f.deps);
    expect(f.deleteTunnel).not.toHaveBeenCalled();
  });

  it("rechecks live activity and never drops returning connectors", async () => {
    const f = fixture();
    f.inspect.mockResolvedValue({ ...tunnel, status: "healthy", disconnectedAt: null });
    await cleanupTunnels(f.deps);
    expect(f.deleteTunnel).not.toHaveBeenCalled();
  });

  it("fails closed when Clerk inventory or metadata is unavailable", async () => {
    const f = fixture();
    f.inventory.mockRejectedValue(new Error("Clerk offline"));
    await expect(cleanupTunnels(f.deps)).rejects.toThrow("Clerk offline");
    expect(f.deleteTunnel).not.toHaveBeenCalled();
    const g = fixture();
    g.read.mockRejectedValue(new Error("Clerk offline"));
    expect((await cleanupTunnels(g.deps)).failed).toBe(1);
    expect(g.deleteTunnel).not.toHaveBeenCalled();
  });

  it("skips malformed directories", async () => {
    const f = fixture();
    f.read.mockResolvedValue({ entries: [], invalidKeys: [entry.installationId] });
    await cleanupTunnels(f.deps);
    expect(f.deleteTunnel).not.toHaveBeenCalled();
  });

  it("skips malformed directory containers", async () => {
    const f = fixture(false);
    f.read.mockResolvedValue({ entries: [], invalidKeys: [], malformed: true });
    await cleanupTunnels(f.deps);
    expect(f.deleteTunnel).not.toHaveBeenCalled();
  });

  it("retries partial cleanup through deleted tunnel records without removing replacements", async () => {
    const f = fixture(true, { deleted: true });
    f.read.mockResolvedValueOnce({ entries: [entry], invalidKeys: [] })
      .mockResolvedValueOnce({ entries: [{ ...entry, tunnelId: "replacement" }], invalidKeys: [] });
    await cleanupTunnels(f.deps);
    expect(f.deleteTunnel).not.toHaveBeenCalled();
    expect(f.deleteTunnelDns).toHaveBeenCalledOnce();
    expect(f.remove).not.toHaveBeenCalled();
  });

  it("finishes cleanup when a deleted tunnel returns 404 on inspection", async () => {
    const f = fixture(true, { deleted: true });
    f.inspect.mockResolvedValue(null);
    await cleanupTunnels(f.deps);
    expect(f.deleteTunnel).not.toHaveBeenCalled();
    expect(f.deleteTunnelDns).toHaveBeenCalledOnce();
    expect(f.remove).toHaveBeenCalledOnce();
  });

  it("does not remove DNS or metadata when Cloudflare refuses tunnel deletion", async () => {
    const f = fixture();
    f.deleteTunnel.mockRejectedValue(new Error("A connector just returned"));
    expect((await cleanupTunnels(f.deps)).failed).toBe(1);
    expect(f.deleteTunnelDns).not.toHaveBeenCalled();
    expect(f.remove).not.toHaveBeenCalled();
  });

  it("keeps metadata if DNS cleanup fails so the next run can retry", async () => {
    const f = fixture();
    f.deleteTunnelDns.mockRejectedValue(new Error("DNS offline"));
    expect((await cleanupTunnels(f.deps)).failed).toBe(1);
    expect(f.remove).not.toHaveBeenCalled();
  });

  it("cleans orphan tunnels belonging to deleted accounts", async () => {
    const f = fixture(false);
    f.inventory.mockResolvedValue([]);
    await cleanupTunnels(f.deps);
    expect(f.deleteTunnel).toHaveBeenCalledOnce();
  });
});

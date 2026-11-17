import { describe, expect, it } from "vitest";
import { DIRECTORY_METADATA_KEY } from "../src/clerk/directoryStore";
import { DirectoryFailure } from "../src/errors/directoryFailure";
import { deriveRuntimeHostname } from "../src/hostname";
import { tunnelNameFor } from "../src/provisioning/tunnels";
import {
  createHarness,
  HOSTNAME_SECRET,
  INSTALL_1,
  INSTALL_2,
  INSTALL_3,
  INSTALL_4,
  SUFFIX,
  USER_A,
  USER_B
} from "./fakes/harness";

const request = (installationId: string, port = 47821, name = "Studio Mac") =>
  ({ installationId, name, environment: "desktop", port }) as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function expectFailure(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(DirectoryFailure);
  await promise.catch((error: unknown) => {
    expect(error instanceof DirectoryFailure ? error.code : null).toBe(code);
  });
}

describe("provision", () => {
  it("creates a tunnel, ingress, DNS and directory entry and returns the token", async () => {
    const h = createHarness();
    const result = await h.service.provision(USER_A, request(INSTALL_1));

    const expectedHostname = await deriveRuntimeHostname(HOSTNAME_SECRET, SUFFIX, USER_A, INSTALL_1);
    expect(result.runtime.hostname).toBe(expectedHostname);
    expect(result.connectorToken).toBe(`token:${result.runtime.tunnelId}:${h.tunnels.tunnels.get(result.runtime.tunnelId)?.secret}`);
    expect(h.tunnels.liveTunnels()).toHaveLength(1);
    expect(h.tunnels.liveTunnels()[0]?.name).toBe(tunnelNameFor(USER_A, INSTALL_1));
    expect(h.tunnels.liveTunnels()[0]?.ingress).toEqual({ hostname: expectedHostname, port: 47821 });
    expect(h.tunnels.dns.get(expectedHostname)?.content).toBe(`${result.runtime.tunnelId}.cfargotunnel.com`);
    expect(await h.service.list(USER_A)).toEqual([result.runtime]);
  });

  it("is idempotent: a second call reuses the hostname and tunnel without creating another", async () => {
    const h = createHarness();
    const first = await h.service.provision(USER_A, request(INSTALL_1));
    h.tick();
    const second = await h.service.provision(USER_A, request(INSTALL_1, 47821, "Renamed Mac"));

    expect(second.runtime.hostname).toBe(first.runtime.hostname);
    expect(second.runtime.tunnelId).toBe(first.runtime.tunnelId);
    expect(second.runtime.registeredAt).toBe(first.runtime.registeredAt);
    expect(second.runtime.name).toBe("Renamed Mac");
    expect(h.tunnels.count("createTunnel")).toBe(1);
    expect(h.tunnels.liveTunnels()).toHaveLength(1);
    expect(h.tunnels.dns.size).toBe(1);
  });

  it("updates the ingress port on re-provision", async () => {
    const h = createHarness();
    const first = await h.service.provision(USER_A, request(INSTALL_1, 47821));
    await h.service.provision(USER_A, request(INSTALL_1, 51000));
    expect(h.tunnels.tunnels.get(first.runtime.tunnelId)?.ingress?.port).toBe(51000);
  });

  it("rejects a new installation over quota before creating any resources", async () => {
    const h = createHarness({ maxRuntimesPerUser: 2 });
    await h.service.provision(USER_A, request(INSTALL_1));
    await h.service.provision(USER_A, request(INSTALL_2));
    const createsBefore = h.tunnels.count("createTunnel");

    await expectFailure(h.service.provision(USER_A, request(INSTALL_3)), "quota");
    expect(h.tunnels.count("createTunnel")).toBe(createsBefore);
    // Existing runtimes can still be re-provisioned at the quota.
    await expect(h.service.provision(USER_A, request(INSTALL_1))).resolves.toBeDefined();
  });

  it("rolls back its own entry and cleans up resources when a race pushes it over quota", async () => {
    const h = createHarness({ maxRuntimesPerUser: 2 });
    await h.service.provision(USER_A, request(INSTALL_1));
    h.tick();
    await h.service.provision(USER_A, request(INSTALL_2));
    h.tick();

    // Simulate a concurrent provision that read the directory before INSTALL_2 landed: hide INSTALL_2 from the
    // pre-check read only, so the post-write re-read sees three entries.
    const store = h.clerk;
    const realRead = store.readPrivateMetadata.bind(store);
    let reads = 0;
    store.readPrivateMetadata = async (userId) => {
      const metadata = await realRead(userId);
      reads += 1;
      const runtimes = isRecord(metadata) ? metadata[DIRECTORY_METADATA_KEY] : undefined;
      if (reads === 1 && isRecord(runtimes)) delete runtimes[INSTALL_2];
      return metadata;
    };

    await expectFailure(h.service.provision(USER_A, request(INSTALL_3)), "quota");
    store.readPrivateMetadata = realRead;
    // The pre-check was bypassed, so a tunnel really was created and then torn down.
    expect(h.tunnels.count("createTunnel")).toBe(3);

    const remaining = (await h.service.list(USER_A)).map((entry) => entry.installationId);
    expect(remaining).toEqual([INSTALL_1, INSTALL_2]);
    const install3Hostname = await deriveRuntimeHostname(HOSTNAME_SECRET, SUFFIX, USER_A, INSTALL_3);
    expect(h.tunnels.dns.has(install3Hostname)).toBe(false);
    expect(h.tunnels.liveTunnels().map((tunnel) => tunnel.name)).toEqual([
      tunnelNameFor(USER_A, INSTALL_1),
      tunnelNameFor(USER_A, INSTALL_2)
    ]);
  });

  it("recreates a remotely deleted tunnel and keeps the same hostname", async () => {
    const h = createHarness();
    const first = await h.service.provision(USER_A, request(INSTALL_1));
    const original = h.tunnels.tunnels.get(first.runtime.tunnelId);
    if (original === undefined) throw new Error("missing tunnel");
    original.deleted = true;

    const second = await h.service.provision(USER_A, request(INSTALL_1));
    expect(second.runtime.tunnelId).not.toBe(first.runtime.tunnelId);
    expect(second.runtime.hostname).toBe(first.runtime.hostname);
    expect(second.runtime.registeredAt).toBe(first.runtime.registeredAt);
    expect(h.tunnels.dns.get(first.runtime.hostname)?.content).toBe(`${second.runtime.tunnelId}.cfargotunnel.com`);
    expect((await h.service.list(USER_A))[0]?.tunnelId).toBe(second.runtime.tunnelId);
  });

  it("reuses an orphaned tunnel by its deterministic name when metadata is missing", async () => {
    const h = createHarness();
    const orphan = await h.tunnels.createTunnel(tunnelNameFor(USER_A, INSTALL_1), "c2VjcmV0");

    const result = await h.service.provision(USER_A, request(INSTALL_1));
    expect(result.runtime.tunnelId).toBe(orphan.id);
    expect(h.tunnels.count("createTunnel")).toBe(1);
    expect(h.tunnels.dns.get(result.runtime.hostname)?.content).toBe(`${orphan.id}.cfargotunnel.com`);
    expect(await h.service.list(USER_A)).toHaveLength(1);
  });

  it("deletes a newly created tunnel and DNS record when the metadata write fails", async () => {
    const h = createHarness();
    h.clerk.failEntryWrites = true;

    await expect(h.service.provision(USER_A, request(INSTALL_1))).rejects.toThrow();
    expect(h.tunnels.liveTunnels()).toHaveLength(0);
    expect(h.tunnels.dns.size).toBe(0);
    expect(await h.service.list(USER_A)).toHaveLength(0);

    h.clerk.failEntryWrites = false;
    await expect(h.service.provision(USER_A, request(INSTALL_1))).resolves.toBeDefined();
    expect(h.tunnels.liveTunnels()).toHaveLength(1);
  });

  it("does not delete a pre-existing tunnel when a later step fails", async () => {
    const h = createHarness();
    const first = await h.service.provision(USER_A, request(INSTALL_1));
    h.clerk.failEntryWrites = true;
    await expect(h.service.provision(USER_A, request(INSTALL_1, 50000))).rejects.toThrow();
    expect(h.tunnels.tunnels.get(first.runtime.tunnelId)?.deleted).toBe(false);
  });

  it("overwrites a malformed stored entry for the same installation", async () => {
    const h = createHarness();
    h.clerk.users.set(USER_A, { [DIRECTORY_METADATA_KEY]: { [INSTALL_1]: { installationId: INSTALL_1, junk: true } } });
    const result = await h.service.provision(USER_A, request(INSTALL_1));
    expect(await h.service.list(USER_A)).toEqual([result.runtime]);
  });

  it("derives different hostnames per user for the same installation ID", async () => {
    const h = createHarness();
    const a = await h.service.provision(USER_A, request(INSTALL_1));
    const b = await h.service.provision(USER_B, request(INSTALL_1));
    expect(a.runtime.hostname).not.toBe(b.runtime.hostname);
    expect(a.runtime.tunnelId).not.toBe(b.runtime.tunnelId);
  });
});

describe("ownership", () => {
  it("prevents another user from deleting, rotating or renaming a runtime by ID", async () => {
    const h = createHarness();
    const owned = await h.service.provision(USER_A, request(INSTALL_1));
    const tunnelBefore = { ...h.tunnels.tunnels.get(owned.runtime.tunnelId) };

    await expectFailure(h.service.remove(USER_B, INSTALL_1), "not-found");
    await expectFailure(h.service.rotate(USER_B, INSTALL_1), "not-found");
    await expectFailure(h.service.rename(USER_B, INSTALL_1, "Mine now"), "not-found");

    expect(h.tunnels.tunnels.get(owned.runtime.tunnelId)).toEqual(tunnelBefore);
    expect(h.tunnels.dns.has(owned.runtime.hostname)).toBe(true);
    expect(await h.service.list(USER_A)).toEqual([owned.runtime]);
    expect(h.tunnels.count("deleteTunnel")).toBe(0);
    expect(h.tunnels.count("updateTunnelSecret")).toBe(0);
  });
});

describe("delete", () => {
  it("drops connections, deletes the tunnel and DNS record and removes the entry", async () => {
    const h = createHarness();
    const { runtime } = await h.service.provision(USER_A, request(INSTALL_1));
    const tunnel = h.tunnels.tunnels.get(runtime.tunnelId);
    if (tunnel === undefined) throw new Error("missing tunnel");
    tunnel.activeConnections = 2;

    await h.service.remove(USER_A, INSTALL_1);
    expect(tunnel.deleted).toBe(true);
    expect(h.tunnels.dns.has(runtime.hostname)).toBe(false);
    expect(await h.service.list(USER_A)).toEqual([]);
  });

  it("tolerates an already deleted tunnel and missing DNS record", async () => {
    const h = createHarness();
    const { runtime } = await h.service.provision(USER_A, request(INSTALL_1));
    const tunnel = h.tunnels.tunnels.get(runtime.tunnelId);
    if (tunnel === undefined) throw new Error("missing tunnel");
    tunnel.deleted = true;
    h.tunnels.dns.clear();

    await expect(h.service.remove(USER_A, INSTALL_1)).resolves.toBeUndefined();
    expect(await h.service.list(USER_A)).toEqual([]);
  });

  it("returns not-found for an unknown installation", async () => {
    const h = createHarness();
    await expectFailure(h.service.remove(USER_A, INSTALL_4), "not-found");
  });
});

describe("rotate", () => {
  it("sets a new secret, drops connections and returns a fresh token", async () => {
    const h = createHarness();
    const first = await h.service.provision(USER_A, request(INSTALL_1));
    const tunnel = h.tunnels.tunnels.get(first.runtime.tunnelId);
    if (tunnel === undefined) throw new Error("missing tunnel");
    tunnel.activeConnections = 1;

    const rotated = await h.service.rotate(USER_A, INSTALL_1);
    expect(rotated.connectorToken).not.toBe(first.connectorToken);
    expect(rotated.runtime).toEqual(first.runtime);
    expect(tunnel.activeConnections).toBe(0);
  });

  it("reports conflict when the tunnel no longer exists", async () => {
    const h = createHarness();
    const first = await h.service.provision(USER_A, request(INSTALL_1));
    const tunnel = h.tunnels.tunnels.get(first.runtime.tunnelId);
    if (tunnel === undefined) throw new Error("missing tunnel");
    tunnel.deleted = true;
    await expectFailure(h.service.rotate(USER_A, INSTALL_1), "conflict");
  });
});

describe("rename", () => {
  it("changes only the name", async () => {
    const h = createHarness();
    const { runtime } = await h.service.provision(USER_A, request(INSTALL_1));
    const renamed = await h.service.rename(USER_A, INSTALL_1, "Office PC");
    expect(renamed).toEqual({ ...runtime, name: "Office PC" });
    expect(await h.service.list(USER_A)).toEqual([renamed]);
  });
});

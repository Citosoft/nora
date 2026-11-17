import { describe, expect, it } from "vitest";
import { createDirectoryStore, DIRECTORY_METADATA_KEY, parseDirectory } from "../src/clerk/directoryStore";
import type { ClerkPrivateMetadataApi } from "../src/types/directoryStore.types";
import { INSTALL_1, INSTALL_2, USER_A } from "./fakes/harness";

const entry = {
  installationId: INSTALL_1,
  name: "Studio Mac",
  environment: "desktop",
  hostname: "abcdefghijklmnopqrstuvwxyz234567.remote.withnora.run",
  tunnelId: "00000000-0000-4000-8000-000000000001",
  registeredAt: "2026-11-16T10:00:00.000Z"
} as const;

describe("parseDirectory", () => {
  it("returns valid entries and reports malformed ones", () => {
    const snapshot = parseDirectory({
      other: "kept",
      [DIRECTORY_METADATA_KEY]: {
        [INSTALL_1]: entry,
        [INSTALL_2]: { ...entry, installationId: INSTALL_2, connectorToken: "leaked?" },
        "install-mismatch-000000": entry,
        "install-nulled-00000000": null
      }
    });
    expect(snapshot.entries).toEqual([entry]);
    expect(snapshot.invalidKeys).toEqual([INSTALL_2, "install-mismatch-000000"]);
  });

  it.each([undefined, null, "x", { [DIRECTORY_METADATA_KEY]: [] }, { [DIRECTORY_METADATA_KEY]: "x" }])("tolerates %j", (metadata) => {
    expect(parseDirectory(metadata)).toEqual({ entries: [], invalidKeys: [] });
  });
});

describe("createDirectoryStore", () => {
  it("writes merge patches scoped to the installation key", async () => {
    const patches: Array<Readonly<Record<string, unknown>>> = [];
    const api: ClerkPrivateMetadataApi = {
      readPrivateMetadata: async () => ({}),
      mergePrivateMetadata: async (_userId, patch) => {
        patches.push(patch);
      }
    };
    const store = createDirectoryStore(api);
    await store.put(USER_A, entry);
    await store.remove(USER_A, INSTALL_1);
    expect(patches).toEqual([
      { [DIRECTORY_METADATA_KEY]: { [INSTALL_1]: entry } },
      { [DIRECTORY_METADATA_KEY]: { [INSTALL_1]: null } }
    ]);
  });
});

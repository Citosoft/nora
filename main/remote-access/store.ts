import { mkdir, readFile, rename, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { remoteStateSchema } from "./stateSchema";
import { isNodeError } from "@main/nodeErrors";
import type { RemoteState, RemoteStateStore, RemoteStoreOptions } from "@main/types/remote-access/store.types";

/** Device-local opt-in and encrypted connector credentials; never included in portable settings. */
export function createRemoteStateStore(options: RemoteStoreOptions): RemoteStateStore {
  let queue = Promise.resolve();
  return {
    async load() {
      try {
        const input: unknown = JSON.parse(await readFile(options.path, "utf8"));
        return remoteStateSchema.parse(input);
      } catch (error) {
        if (!isNodeError(error) || error.code !== "ENOENT") throw new Error("Remote access settings could not be restored. Your existing registration has been preserved.");
        return { version: 1, installationId: options.nextId(), name: options.name.trim().slice(0, 64) || "Nora",
          enabled: false, ownerId: null, port: null, runtime: null, connectorSecret: null, cleanup: [], revokedSessions: [] };
      }
    },
    save(state: RemoteState) {
      const snapshot = remoteStateSchema.parse(state);
      const job = queue.then(async () => {
        await mkdir(path.dirname(options.path), { recursive: true, mode: 0o700 });
        const temporary = `${options.path}.${options.nextId()}.tmp`;
        try {
          await writeFile(temporary, JSON.stringify(snapshot), { mode: 0o600, flag: "wx" });
          await rename(temporary, options.path);
        } finally { await rm(temporary, { force: true }); }
      });
      queue = job.catch(() => undefined);
      return job;
    },
    encrypt: (token) => options.codec.encrypt(token),
    decrypt: (token) => options.codec.decrypt(token)
  };
}

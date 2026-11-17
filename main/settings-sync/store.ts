import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { isNodeError } from "@main/nodeErrors";
import { syncStoreSchema } from "./journal";
import type { SyncPersistence } from "@main/types/settings-sync/store.types";

export function createSyncPersistence(path: string): SyncPersistence {
  let saving = Promise.resolve();
  return {
    async read() {
      try { const input: unknown = JSON.parse(await readFile(path, "utf8")); return syncStoreSchema.parse(input); }
      catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") return { version: 1, deviceId: randomUUID(), lastUserId: null, accounts: {} };
        throw new Error("Saved sync state could not be loaded. Local settings are unchanged.");
      }
    },
    save(store) {
      const content = JSON.stringify(store);
      saving = saving.catch(() => undefined).then(async () => {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(`${path}.tmp`, content, { encoding: "utf8", mode: 0o600 });
        await rename(`${path}.tmp`, path);
      });
      return saving;
    },
    flush: () => saving
  };
}

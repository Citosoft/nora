import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isNodeError } from "@main/nodeErrors";
import type { JsonFileStore, JsonFileStoreOptions } from "@main/types/jsonFileStore.types";

/** A small JSON document written through a temporary file and rename, so readers never see a partial write. */
export function createJsonFileStore<T>(options: JsonFileStoreOptions<T>): JsonFileStore<T> {
  let queue: Promise<void> = Promise.resolve();
  return {
    async load() {
      let text: string;
      try {
        text = await readFile(options.path, "utf8");
      } catch (error) {
        if (!isNodeError(error) || error.code !== "ENOENT") options.onReadError?.(error);
        return options.empty;
      }
      try {
        return options.normalize(JSON.parse(text));
      } catch (error) {
        options.onReadError?.(error);
        return options.empty;
      }
    },
    save(value) {
      const snapshot = options.normalize(value);
      const job = queue.then(async () => {
        await mkdir(path.dirname(options.path), { recursive: true });
        const temporary = `${options.path}.${options.nextId()}.tmp`;
        try {
          await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "wx" });
          await rename(temporary, options.path);
        } finally {
          await rm(temporary, { force: true });
        }
      });
      queue = job.catch(() => undefined);
      return job;
    }
  };
}

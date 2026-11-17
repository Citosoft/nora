import { UpstreamError } from "../../src/errors/upstreamError";
import { DIRECTORY_METADATA_KEY } from "../../src/clerk/directoryStore";
import type { ClerkPrivateMetadataApi } from "../../src/types/directoryStore.types";

/**
 * Emulates Clerk's metadata PATCH: a recursive merge where `null` deletes a key. Pairs with the real
 * `createDirectoryStore`, so store logic is exercised rather than faked.
 */
export class FakeClerkMetadata implements ClerkPrivateMetadataApi {
  readonly users = new Map<string, Record<string, unknown>>();
  failMerges = false;
  /** Fails only merges that add (non-null) entries, so rollbacks still succeed. */
  failEntryWrites = false;
  merges = 0;

  async readPrivateMetadata(userId: string): Promise<unknown> {
    return structuredClone(this.users.get(userId) ?? {});
  }

  async mergePrivateMetadata(userId: string, patch: Readonly<Record<string, unknown>>): Promise<void> {
    this.merges += 1;
    if (this.failMerges || (this.failEntryWrites && writesEntry(patch))) {
      throw new UpstreamError("clerk", 500, "merge failed");
    }
    this.users.set(userId, deepMerge(this.users.get(userId) ?? {}, patch));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(target: Record<string, unknown>, patch: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete result[key];
    else if (isRecord(value)) result[key] = deepMerge(isRecord(result[key]) ? result[key] : {}, value);
    else result[key] = value;
  }
  return result;
}

function writesEntry(patch: Readonly<Record<string, unknown>>): boolean {
  const runtimes = patch[DIRECTORY_METADATA_KEY];
  return isRecord(runtimes) && Object.values(runtimes).some((value) => value !== null);
}

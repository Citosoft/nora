import { createClerkClient } from "@clerk/backend";
import { runtimeDirectoryEntrySchema } from "@shared/remote-access/directory";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import { z } from "zod";
import { UpstreamError } from "../errors/upstreamError";
import type { ClerkPrivateMetadataApi, RuntimeDirectorySnapshot, RuntimeDirectoryStore } from "../types/directoryStore.types";

/** Private metadata key holding `{ [installationId]: RuntimeDirectoryEntry }`. Never holds credentials. */
export const DIRECTORY_METADATA_KEY = "noraRuntimes";

const directoryRecordSchema = z.record(z.string(), z.unknown());

/**
 * Pure parse of whatever is stored. Malformed entries (or entries filed under a key that does not match their own
 * installation ID) are skipped and reported, so one bad value never hides the rest of the directory.
 */
export function parseDirectory(privateMetadata: unknown): RuntimeDirectorySnapshot {
  const metadata = directoryRecordSchema.safeParse(privateMetadata);
  const raw = metadata.success ? directoryRecordSchema.safeParse(metadata.data[DIRECTORY_METADATA_KEY]) : null;
  if (raw === null || !raw.success) return { entries: [], invalidKeys: [] };

  const entries: RuntimeDirectoryEntry[] = [];
  const invalidKeys: string[] = [];
  for (const [key, value] of Object.entries(raw.data)) {
    if (value === null) continue;
    const entry = runtimeDirectoryEntrySchema.safeParse(value);
    if (entry.success && entry.data.installationId === key) entries.push(entry.data);
    else invalidKeys.push(key);
  }
  return { entries, invalidKeys };
}

/**
 * Writes rely on Clerk's merge-patch semantics (`PATCH /users/{id}/metadata`, deep merge, `null` deletes a key), so
 * concurrent writes to different installation IDs never clobber each other. It is not transactional: the provisioning
 * service re-reads after writes where ordering matters (quota).
 */
export function createDirectoryStore(api: ClerkPrivateMetadataApi): RuntimeDirectoryStore {
  return {
    async read(userId) {
      return parseDirectory(await api.readPrivateMetadata(userId));
    },
    async put(userId, entry) {
      await api.mergePrivateMetadata(userId, { [DIRECTORY_METADATA_KEY]: { [entry.installationId]: entry } });
    },
    async remove(userId, installationId) {
      await api.mergePrivateMetadata(userId, { [DIRECTORY_METADATA_KEY]: { [installationId]: null } });
    }
  };
}

/** Adapts the Clerk Backend SDK. SDK errors become `UpstreamError` without echoing their payloads. */
export function createClerkMetadataApi(secretKey: string): ClerkPrivateMetadataApi {
  const clerk = createClerkClient({ secretKey });
  return {
    async readPrivateMetadata(userId) {
      try {
        const user = await clerk.users.getUser(userId);
        return user.privateMetadata;
      } catch {
        throw new UpstreamError("clerk", null, "getUser failed");
      }
    },
    async mergePrivateMetadata(userId, patch) {
      try {
        await clerk.users.updateUserMetadata(userId, { privateMetadata: patch });
      } catch {
        throw new UpstreamError("clerk", null, "updateUserMetadata failed");
      }
    }
  };
}

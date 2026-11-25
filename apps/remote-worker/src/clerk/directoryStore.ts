import { createClerkClient } from "@clerk/backend";
import { runtimeDirectoryEntrySchema } from "@shared/remote-access/directory";
import { UpstreamError } from "../errors/upstreamError";
import { parseKeyedMetadata } from "./keyedMetadata";
import type { ClerkPrivateMetadataApi, RuntimeDirectorySnapshot, RuntimeDirectoryStore } from "../types/directoryStore.types";

/** Private metadata key holding `{ [installationId]: RuntimeDirectoryEntry }`. Never holds credentials. */
export const DIRECTORY_METADATA_KEY = "noraRuntimes";

/** Pure parse of whatever is stored; see `parseKeyedMetadata` for how malformed entries are reported. */
export function parseDirectory(privateMetadata: unknown): RuntimeDirectorySnapshot {
  return parseKeyedMetadata(privateMetadata, DIRECTORY_METADATA_KEY, runtimeDirectoryEntrySchema, (entry) => entry.installationId);
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

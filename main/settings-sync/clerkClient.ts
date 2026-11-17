import type { AccountSession } from "@main/types/account/session.types";
import { createClerkNativeClient } from "@main/account/clerkClient";
import type { ClerkNativeClient, ClerkNativeClientOptions } from "@main/types/account/clerkClient.types";
import { z } from "zod";
import { syncDocumentSchema } from "@shared/settings-sync/contracts";
import type { CloudPatch, SettingsCloudClient } from "@main/types/settings-sync/client.types";
import { METADATA_KEY, metadataSchema, prepareCloudPatch, readCloudDocument } from "./cloudDocument";

const userSchema = z.object({ response: z.object({ id: z.string(), unsafe_metadata: metadataSchema }) });

/** Uses Clerk's native Frontend API with the same encrypted client token as its Electron SDK. */
export function createClerkSyncClient(options: ClerkNativeClientOptions, native: ClerkNativeClient = createClerkNativeClient(options)): SettingsCloudClient {
  const request = (session: AccountSession, signal: AbortSignal, entries?: CloudPatch) => native.request(session, signal, {
    sessionSelection: "query",
    path: `/v1/me${entries ? "/metadata" : ""}`, method: entries ? "PATCH" : "GET",
    ...(entries ? { body: new URLSearchParams({ unsafe_metadata: JSON.stringify({ [METADATA_KEY]: { version: 2, entries } }) }) } : {}),
    parse(input) {
      const user = userSchema.safeParse(input);
      if (!user.success || user.data.response.id !== session.userId) throw new Error("Settings sync could not verify your account.");
      return user.data.response.unsafe_metadata;
    }
  });
  return {
    async read(session, signal) {
      const metadata = await request(session, signal); const snapshot = readCloudDocument(metadata);
      if (snapshot.document && (snapshot.version !== 2 || snapshot.legacyFields.length)) {
        const migrated = await request(session, signal, prepareCloudPatch(metadata, {}));
        return readCloudDocument(migrated).document;
      }
      return snapshot.document;
    },
    async write(session, entries, signal) {
      const metadata = await request(session, signal);
      const patch = prepareCloudPatch(metadata, entries);
      const snapshot = readCloudDocument(metadata);
      if (!Object.keys(patch).length && snapshot.version === 2 && !snapshot.legacyFields.length) return syncDocumentSchema.parse(snapshot.document);
      return syncDocumentSchema.parse(readCloudDocument(await request(session, signal, patch)).document);
    }
  };
}

import { z } from "zod";
import { syncDocumentSchema } from "@shared/settings-sync/contracts";
import type { ClerkSyncClientOptions, CloudPatch, SettingsCloudClient, SyncSession } from "@main/types/settings-sync/client.types";
import { METADATA_KEY, metadataSchema, prepareCloudPatch, readCloudDocument } from "./cloudDocument";

const TOKEN_KEY = "__clerk_client_jwt";
const userSchema = z.object({ response: z.object({ id: z.string(), unsafe_metadata: metadataSchema }) });

/** Uses Clerk's native Frontend API with the same encrypted client token as its Electron SDK. */
export function createClerkSyncClient(options: ClerkSyncClientOptions): SettingsCloudClient {
  const assertSession = (expected: SyncSession): void => {
    const current = options.session();
    if (!current || current.userId !== expected.userId || current.sessionId !== expected.sessionId) throw new Error("Your account changed. Sign in and try syncing again.");
  };
  const request = async (session: SyncSession, signal: AbortSignal, entries?: CloudPatch) => {
    assertSession(session);
    const token = await options.tokens.getItem(TOKEN_KEY);
    signal.throwIfAborted(); assertSession(session);
    if (!token) throw new Error("Sign in again to sync settings.");
    const url = new URL(`https://${options.host}/v1/me${entries ? "/metadata" : ""}`);
    url.searchParams.set("_is_native", "1"); url.searchParams.set("_clerk_session_id", session.sessionId);
    url.searchParams.set("__clerk_api_version", "2026-05-12");
    const response = await options.fetch(url, { method: entries ? "PATCH" : "GET", signal,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
      ...(entries ? { body: new URLSearchParams({ unsafe_metadata: JSON.stringify({ [METADATA_KEY]: { version: 2, entries } }) }) } : {}) })
      .catch(() => { throw new Error("Account services could not be reached. Local changes are kept for retry."); });
    assertSession(session);
    if (!response.ok) throw new Error(response.status === 429 ? "Settings sync is busy. Try again shortly." : response.status === 401 || response.status === 403 ? "Sign in again to sync settings." : "Settings could not sync. Your local changes are kept for retry.");
    const input: unknown = await response.json();
    signal.throwIfAborted(); assertSession(session);
    const user = userSchema.safeParse(input);
    if (!user.success || user.data.response.id !== session.userId) throw new Error("Settings sync could not verify your account.");
    const authorization = response.headers.get("Authorization");
    if (authorization) await options.tokens.setItem(TOKEN_KEY, authorization.replace(/^Bearer /, ""));
    return user.data.response.unsafe_metadata;
  };
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

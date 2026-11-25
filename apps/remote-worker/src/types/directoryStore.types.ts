import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";

/** A `{ [id]: entry }` map parsed from one Clerk private-metadata key. */
export interface KeyedMetadataSnapshot<T> {
  /** The container itself is malformed; callers cannot establish ownership safely. */
  readonly malformed?: true;
  readonly entries: readonly T[];
  /** Keys present in metadata whose value failed validation; they are ignored but may need overwriting. */
  readonly invalidKeys: readonly string[];
}

export type RuntimeDirectorySnapshot = KeyedMetadataSnapshot<RuntimeDirectoryEntry>;

/** Per-user runtime directory persisted in Clerk private metadata. */
export interface RuntimeDirectoryStore {
  read(userId: string): Promise<RuntimeDirectorySnapshot>;
  put(userId: string, entry: RuntimeDirectoryEntry): Promise<void>;
  remove(userId: string, installationId: string): Promise<void>;
}

/** Narrow slice of the Clerk Backend API the store needs; lets tests avoid the real SDK. */
export interface ClerkPrivateMetadataApi {
  readPrivateMetadata(userId: string): Promise<unknown>;
  /** Deep-merge patch; a `null` value removes that key. */
  mergePrivateMetadata(userId: string, patch: Readonly<Record<string, unknown>>): Promise<void>;
}

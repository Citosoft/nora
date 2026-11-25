import { createHash } from "node:crypto";
import type { CheckpointEntry, FileSnapshot } from "@main/types/execution/checkpoints.types";

/** Every entry in a snapshot by path, whether its bytes are inline, fingerprinted or indexed. */
export function snapshotEntries(snapshot: FileSnapshot): Map<string, CheckpointEntry> {
  return new Map([...snapshot.files, ...(snapshot.omitted ?? []), ...(snapshot.indexed ?? [])].map((file) => [file.path, file]));
}

/** The SHA-256 of an entry's bytes; null for an absent file. */
export function entryDigest(file: CheckpointEntry | undefined): string | null {
  if (!file) return null;
  return "content" in file ? createHash("sha256").update(Buffer.from(file.content, "base64")).digest("hex") : file.hash;
}

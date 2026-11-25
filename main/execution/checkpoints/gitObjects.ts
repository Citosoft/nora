import { createHash } from "node:crypto";
import { runWorkspaceGit, runWorkspaceGitBytes } from "../gitProcess";
import type { CheckpointEntry } from "@main/types/execution/checkpoints.types";
import { gitObjectIdPattern } from "./schema";

/** Git's object id for a blob: SHA-1 or SHA-256 (matching the repository's id length) over a typed header and the bytes. */
export function gitBlobId(content: Buffer, idLength: number): string {
  return createHash(idLength === 64 ? "sha256" : "sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
}

/** Stage-0 index blob ids by path. Conflicted paths have no single blob, so they are left out and captured by content. */
export async function readIndexBlobIds(executable: string, root: string): Promise<ReadonlyMap<string, string>> {
  const { stdout } = await runWorkspaceGit(executable, root, ["ls-files", "--stage", "-z"]);
  const ids = new Map<string, string>();
  for (const record of stdout.split("\0")) {
    const match = /^\d{6} ([a-f0-9]+) (\d)\t(.+)$/s.exec(record);
    if (match && match[2] === "0" && gitObjectIdPattern.test(match[1])) ids.set(match[3], match[1]);
  }
  return ids;
}

/** A blob's bytes from the object database, or null when the object can no longer be read. */
export async function readGitBlob(executable: string, root: string, id: string): Promise<Buffer | null> {
  try { return await runWorkspaceGitBytes(executable, root, ["cat-file", "blob", id]); }
  catch { return null; }
}

/**
 * A snapshot entry's bytes: kept inline, read back from the object database and verified against the recorded hash,
 * or null when only a fingerprint exists. An absent entry is an absent file, so it reads as empty.
 */
export async function readCheckpointEntry(executable: string, root: string, file: CheckpointEntry | undefined): Promise<Buffer | null> {
  if (!file) return Buffer.alloc(0);
  if ("content" in file) return Buffer.from(file.content, "base64");
  if (!("object" in file)) return null;
  const content = await readGitBlob(executable, root, file.object);
  return content && createHash("sha256").update(content).digest("hex") === file.hash ? content : null;
}

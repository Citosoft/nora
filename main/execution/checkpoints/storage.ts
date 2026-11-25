import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { CheckpointCapture, CheckpointManifest, ManifestCapture, StoredCheckpoint } from "@main/types/execution/checkpoints.types";
import { checkpointManifestSchema, maxFileBytes, storedCheckpointSchema } from "./schema";
import { readJsonRow } from "../sqliteRows";

const blobRowSchema = z.object({ content: z.instanceof(Uint8Array).refine((content) => content.byteLength <= maxFileBytes) });
const hashBytes = (content: Uint8Array): string => createHash("sha256").update(content).digest("hex");

/** Stores bytes once by hash and records that this turn's checkpoint uses them, so retention knows when they are unused. */
function blobWriter(database: DatabaseSync, conversationId: string, runId: string): (content: Uint8Array) => string {
  const insert = database.prepare("INSERT INTO checkpoint_blobs VALUES (?, ?) ON CONFLICT(hash) DO NOTHING");
  const reference = database.prepare("INSERT INTO checkpoint_blob_refs VALUES (?, ?, ?) ON CONFLICT DO NOTHING");
  return (content) => {
    const hash = hashBytes(content);
    insert.run(hash, content);
    reference.run(conversationId, runId, hash);
    return hash;
  };
}

/** Called inside the execution transaction: manifests and deduplicated bytes commit or roll back together. */
export function saveCheckpoint(database: DatabaseSync, input: StoredCheckpoint): void {
  const checkpoint = storedCheckpointSchema.parse(input);
  const store = blobWriter(database, checkpoint.conversationId, checkpoint.runId);
  const encode = (capture: CheckpointCapture): ManifestCapture => capture.status === "unavailable" ? capture
    : { status: "ready", snapshot: { ...capture.snapshot, files: capture.snapshot.files.map((file) => {
      const hash = store(Buffer.from(file.content, "base64"));
      return { path: file.path, mode: file.mode, hash };
    }) } };
  const manifest: CheckpointManifest = { ...checkpoint, baseline: encode(checkpoint.baseline), final: checkpoint.final ? encode(checkpoint.final) : null };
  database.prepare(`INSERT INTO turn_checkpoints VALUES (?, ?, ?, ?) ON CONFLICT(conversation_id, run_id)
    DO UPDATE SET baseline_ready = excluded.baseline_ready, json = excluded.json`)
    .run(checkpoint.conversationId, checkpoint.runId, Number(checkpoint.baseline.status === "ready"), JSON.stringify(manifest));
}

export function loadCheckpoint(database: DatabaseSync, conversationId: string, runId: string): StoredCheckpoint | null {
  const row = database.prepare("SELECT json FROM turn_checkpoints WHERE conversation_id = ? AND run_id = ?").get(conversationId, runId);
  if (!row) return null;
  const manifest = readJsonRow(row, checkpointManifestSchema);
  if (manifest.conversationId !== conversationId || manifest.runId !== runId) throw new Error("Checkpoint identity does not match its owner");
  const select = database.prepare("SELECT content FROM checkpoint_blobs WHERE hash = ?");
  const decode = (capture: ManifestCapture): CheckpointCapture => capture.status === "unavailable" ? capture
    : { status: "ready", snapshot: { ...capture.snapshot, files: capture.snapshot.files.map((file) => {
      const { content } = blobRowSchema.parse(select.get(file.hash));
      if (hashBytes(content) !== file.hash) throw new Error("Checkpoint content failed its integrity check");
      return { path: file.path, mode: file.mode, content: Buffer.from(content).toString("base64") };
    }) } };
  return storedCheckpointSchema.parse({ ...manifest, baseline: decode(manifest.baseline), final: manifest.final ? decode(manifest.final) : null });
}

/** Keeps bytes a turn's undo needs that would otherwise live only in Git's object database. */
export function pinCheckpointBlobs(database: DatabaseSync, conversationId: string, runId: string, contents: readonly Uint8Array[]): void {
  const store = blobWriter(database, conversationId, runId);
  for (const content of contents) {
    if (content.byteLength > maxFileBytes) throw new Error("Pinned checkpoint content exceeds the file limit");
    store(content);
  }
}

/** Verified bytes for a hash, or null when no checkpoint kept them. */
export function readCheckpointBlob(database: DatabaseSync, hash: string): Buffer | null {
  const row = database.prepare("SELECT content FROM checkpoint_blobs WHERE hash = ?").get(hash);
  if (!row) return null;
  const { content } = blobRowSchema.parse(row);
  if (hashBytes(content) !== hash) throw new Error("Checkpoint content failed its integrity check");
  return Buffer.from(content);
}

/** Drops a turn's checkpoint and any bytes no remaining checkpoint uses. */
export function deleteCheckpoint(database: DatabaseSync, conversationId: string, runId: string): void {
  database.prepare("DELETE FROM turn_checkpoints WHERE conversation_id = ? AND run_id = ?").run(conversationId, runId);
  database.prepare("DELETE FROM checkpoint_blob_refs WHERE conversation_id = ? AND run_id = ?").run(conversationId, runId);
  database.exec("DELETE FROM checkpoint_blobs WHERE NOT EXISTS (SELECT 1 FROM checkpoint_blob_refs r WHERE r.hash = checkpoint_blobs.hash)");
}

const checkpointRunRowSchema = z.object({ runId: z.string().min(1), attemptId: z.string().min(1), active: z.number().int() });

/** A conversation's checkpointed turns, newest first; `active` marks turns with unfinished review or undo work. */
export function listCheckpointRuns(database: DatabaseSync, conversationId: string): { runId: string; attemptId: string; active: boolean }[] {
  return database.prepare(`SELECT c.run_id AS runId, json_extract(c.json, '$.attemptId') AS attemptId,
      EXISTS (SELECT 1 FROM effects e WHERE json_extract(e.json, '$.conversationId') = c.conversation_id
        AND json_extract(e.json, '$.runId') = c.run_id AND json_extract(e.json, '$.status') IN ('pending', 'claimed')) AS active
    FROM turn_checkpoints c JOIN conversation_runs r ON r.conversation_id = c.conversation_id AND r.id = c.run_id
    WHERE c.conversation_id = ? ORDER BY r.position DESC`).all(conversationId)
    .map((row) => { const parsed = checkpointRunRowSchema.parse(row); return { runId: parsed.runId, attemptId: parsed.attemptId, active: parsed.active === 1 }; });
}

/** Whether a turn kept an uninterrupted before/after pair, without hydrating any file contents. */
export function hasRestorableCheckpoint(database: DatabaseSync, conversationId: string, runId: string): boolean {
  return database.prepare(`SELECT 1 FROM turn_checkpoints WHERE conversation_id = ? AND run_id = ? AND baseline_ready = 1
    AND json_extract(json, '$.continuity') = 'intact' AND json_extract(json, '$.final.status') = 'ready'`).get(conversationId, runId) !== undefined;
}

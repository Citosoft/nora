import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { CheckpointCapture, CheckpointManifest, ManifestCapture, StoredCheckpoint } from "@main/types/execution/checkpoints.types";
import { checkpointManifestSchema, maxFileBytes, storedCheckpointSchema } from "./schema";
import { readJsonRow } from "../sqliteRows";

const blobRowSchema = z.object({ content: z.instanceof(Uint8Array).refine((content) => content.byteLength <= maxFileBytes) });
const hashBytes = (content: Uint8Array): string => createHash("sha256").update(content).digest("hex");

/** Called inside the execution transaction: manifests and deduplicated bytes commit or roll back together. */
export function saveCheckpoint(database: DatabaseSync, input: StoredCheckpoint): void {
  const checkpoint = storedCheckpointSchema.parse(input);
  const insert = database.prepare("INSERT INTO checkpoint_blobs VALUES (?, ?) ON CONFLICT(hash) DO NOTHING");
  const encode = (capture: CheckpointCapture): ManifestCapture => capture.status === "unavailable" ? capture
    : { status: "ready", snapshot: { ...capture.snapshot, files: capture.snapshot.files.map((file) => {
      const content = Buffer.from(file.content, "base64"); const hash = hashBytes(content);
      insert.run(hash, content);
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

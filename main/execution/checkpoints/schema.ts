import { z } from "zod";
import { checkpointUnavailableSchema, fileModeSchema } from "@shared/conversations/checkpoints";
import { workspaceRefSchema } from "@shared/conversations/contracts";

export const maxFileBytes = 1024 * 1024;
export const maxSnapshotBytes = 8 * 1024 * 1024;
export const maxSnapshotFiles = 5_000;

export const checkpointPathSchema = z.string().min(1).max(32_768).refine((path) =>
  !path.includes("\\") && !path.includes("\0") && !/^[a-z]:/i.test(path)
  && path.split("/").every((part) => part !== "" && part !== "." && part !== ".." && part !== ".git"));
const fileSchema = z.object({ path: checkpointPathSchema, mode: fileModeSchema,
  content: z.string().max(Math.ceil(maxFileBytes / 3) * 4).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
}).strict().refine((file) => Buffer.byteLength(file.content, "base64") <= maxFileBytes, "File exceeds checkpoint limit");
export const fileSnapshotSchema = z.object({ capturedAt: z.string().datetime(), files: z.array(fileSchema).max(maxSnapshotFiles) }).strict()
  .refine((snapshot) => new Set(snapshot.files.map((file) => file.path)).size === snapshot.files.length, "Duplicate checkpoint path")
  .refine((snapshot) => snapshot.files.reduce((total, file) => total + Buffer.byteLength(file.content, "base64"), 0) <= maxSnapshotBytes, "Checkpoint exceeds size limit");
export const checkpointCaptureSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ready"), snapshot: fileSnapshotSchema }).strict(),
  z.object({ status: z.literal("unavailable"), reason: checkpointUnavailableSchema }).strict()
]);
export const storedCheckpointSchema = z.object({ conversationId: z.string().min(1), runId: z.string().min(1), attemptId: z.string().min(1),
  workspace: workspaceRefSchema, continuity: z.enum(["intact", "interrupted"]),
  baseline: checkpointCaptureSchema, final: checkpointCaptureSchema.nullable() }).strict();

const manifestSnapshotSchema = z.object({ capturedAt: z.string().datetime(), files: z.array(z.object({
  path: checkpointPathSchema, mode: fileModeSchema, hash: z.string().regex(/^[a-f0-9]{64}$/)
}).strict()).max(maxSnapshotFiles) }).strict();
export const manifestCaptureSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ready"), snapshot: manifestSnapshotSchema }).strict(),
  z.object({ status: z.literal("unavailable"), reason: checkpointUnavailableSchema }).strict()
]);
export const checkpointManifestSchema = storedCheckpointSchema.omit({ baseline: true, final: true }).extend({
  baseline: manifestCaptureSchema, final: manifestCaptureSchema.nullable()
});

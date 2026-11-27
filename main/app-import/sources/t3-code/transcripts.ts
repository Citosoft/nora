import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { toIsoTimestamp } from "@main/app-import/timestamps";
import type { AppImportTranscript, AppImportTranscriptMessage } from "@shared/types/app-import/appImportPlan.types";
import type { T3CodeSchemaInfo } from "@main/types/app-import/t3Code.types";
import { parseJson } from "./modelSelection";

const roleSchema = z.enum(["user", "assistant"]);
const v2RowSchema = z.object({ role: z.string(), created_at: z.string(), payload_json: z.string() });
const v2PayloadSchema = z.object({ text: z.string() });
const v1RowSchema = z.object({ role: z.string(), created_at: z.string(), text: z.string() });

/** Stored user/assistant text for one thread, oldest first; empty and streaming rows are left out. */
export function readT3CodeTranscript(database: DatabaseSync, schema: T3CodeSchemaInfo, threadId: string): AppImportTranscript | undefined {
  const messages: AppImportTranscriptMessage[] = [];
  const push = (role: string, createdAt: string, text: string | undefined): void => {
    const parsedRole = roleSchema.safeParse(role);
    if (parsedRole.success && text?.trim()) messages.push({ role: parsedRole.data, text, createdAt: toIsoTimestamp(createdAt, new Date(0).toISOString()) });
  };
  if (schema.schema === "v2") {
    const rows = database.prepare("SELECT role, created_at, payload_json FROM orchestration_v2_projection_messages WHERE thread_id = ? AND streaming = 0 ORDER BY created_at, message_id").all(threadId);
    for (const raw of rows) {
      const row = v2RowSchema.safeParse(raw);
      if (!row.success) continue;
      const payload = v2PayloadSchema.safeParse(parseJson(row.data.payload_json));
      push(row.data.role, row.data.created_at, payload.success ? payload.data.text : undefined);
    }
  } else {
    const rows = database.prepare("SELECT role, created_at, text FROM projection_thread_messages WHERE thread_id = ? AND is_streaming = 0 ORDER BY created_at, message_id").all(threadId);
    for (const raw of rows) {
      const row = v1RowSchema.safeParse(raw);
      if (row.success) push(row.data.role, row.data.created_at, row.data.text);
    }
  }
  return messages.length > 0 ? { completeness: "full", messages } : undefined;
}

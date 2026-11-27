import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { appImportKey } from "@main/app-import/importKey";
import { toProviderRef } from "@main/app-import/providerRef";
import { sqliteSelectList } from "@main/app-import/readonlySqlite";
import { toIsoTimestamp } from "@main/app-import/timestamps";
import type { AppImportProviderRef, AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportThreadCandidate } from "@main/types/app-import/appImportSource.types";
import type { T3CodeProjects, T3CodeProviderResolver, T3CodeSchemaInfo, T3CodeThreadRow, T3CodeThreads } from "@main/types/app-import/t3Code.types";
import { parseJson, parseT3CodeModelSelection } from "./modelSelection";

const nullableText = z.string().nullable().catch(null);
/** Provider resume cursors: Claude `{ resume }`, Codex `{ threadId }` (provider_session_runtime). */
const resumeCursorSchema = z.union([z.object({ resume: z.string().min(1) }).transform((cursor) => cursor.resume), z.object({ threadId: z.string().min(1) }).transform((cursor) => cursor.threadId)]);
const runtimePayloadSchema = z.object({ cwd: z.string().min(1).optional().catch(undefined) });
const nativeThreadRefSchema = z.object({ nativeThreadRef: z.object({ driver: z.string().min(1), nativeId: z.string().min(1) }) });
const v2PayloadSchema = z.object({
  modelSelection: z.unknown().optional(),
  providerInstanceId: z.string().optional().catch(undefined),
  branch: z.string().nullable().optional().catch(null),
  worktreePath: z.string().nullable().optional().catch(null),
  pinnedAt: z.string().nullable().optional().catch(null),
  lineage: z.object({ relationshipToParent: z.string().nullable().optional() }).optional().catch(undefined)
});

const v2Sql = (tables: ReadonlySet<string>): string => `
  SELECT t.thread_id, t.project_id, t.title, t.default_provider, t.created_at, t.updated_at, t.archived_at, t.deleted_at, t.payload_json,
    ${tables.has("orchestration_v2_projection_provider_threads") ? "pt.payload_json" : "NULL"} AS provider_thread_json,
    ${tables.has("provider_session_runtime") ? "r.provider_name, r.resume_cursor_json, r.runtime_payload_json" : "NULL AS provider_name, NULL AS resume_cursor_json, NULL AS runtime_payload_json"}
  FROM orchestration_v2_projection_threads t
  ${tables.has("orchestration_v2_projection_provider_threads") ? "LEFT JOIN orchestration_v2_projection_provider_threads pt ON pt.provider_thread_id = t.active_provider_thread_id" : ""}
  ${tables.has("provider_session_runtime") ? "LEFT JOIN provider_session_runtime r ON r.thread_id = t.thread_id" : ""}
  ORDER BY t.created_at`;

const v2RowSchema = z.object({
  thread_id: z.string(), project_id: z.string(), title: z.string(), default_provider: z.string(),
  created_at: z.string(), updated_at: z.string(), archived_at: nullableText, deleted_at: nullableText, payload_json: z.string(),
  provider_thread_json: nullableText, provider_name: nullableText, resume_cursor_json: nullableText, runtime_payload_json: nullableText
});

const V1_THREAD_COLUMNS = ["thread_id", "project_id", "title", "branch", "worktree_path", "created_at", "updated_at", "deleted_at", "archived_at", "pinned_at", "model_selection_json"] as const;
const v1RowSchema = z.object({
  thread_id: z.string(), project_id: z.string(), title: z.string(), branch: nullableText, worktree_path: nullableText,
  created_at: z.string(), updated_at: z.string(), deleted_at: nullableText, archived_at: nullableText, pinned_at: nullableText, model_selection_json: nullableText,
  session_provider: nullableText, provider_name: nullableText, resume_cursor_json: nullableText, runtime_payload_json: nullableText
});

function resumeCursorId(json: string | null): string | undefined {
  const parsed = resumeCursorSchema.safeParse(parseJson(json));
  return parsed.success ? parsed.data : undefined;
}

function runtimeCwd(json: string | null): string | undefined {
  const parsed = runtimePayloadSchema.safeParse(parseJson(json));
  return parsed.success ? parsed.data.cwd : undefined;
}

function readV2Rows(database: DatabaseSync, schema: T3CodeSchemaInfo, resolveProvider: T3CodeProviderResolver): T3CodeThreadRow[] {
  return database.prepare(v2Sql(schema.tables)).all().flatMap((raw): T3CodeThreadRow[] => {
    const parsed = v2RowSchema.safeParse(raw);
    if (!parsed.success) return [];
    const row = parsed.data;
    const payload = v2PayloadSchema.safeParse(parseJson(row.payload_json));
    const data = payload.success ? payload.data : undefined;
    const model = parseT3CodeModelSelection(data?.modelSelection, resolveProvider);
    // The active provider thread's native ref is authoritative; the runtime resume cursor covers rows without one.
    // Both name the driver directly, so they also identify the provider when settings.json lacks the instance.
    const nativeRef = nativeThreadRefSchema.safeParse(parseJson(row.provider_thread_json));
    const driver = nativeRef.success ? nativeRef.data.nativeThreadRef.driver : row.provider_name;
    const provider: AppImportProviderRef = driver ? toProviderRef(driver) : model ?? resolveProvider(data?.providerInstanceId ?? row.default_provider);
    return [{
      threadId: row.thread_id, projectId: row.project_id, title: row.title, provider, model: model?.model,
      nativeSessionId: nativeRef.success ? nativeRef.data.nativeThreadRef.nativeId : resumeCursorId(row.resume_cursor_json),
      runtimeCwd: runtimeCwd(row.runtime_payload_json), branch: data?.branch ?? null, worktreePath: data?.worktreePath ?? null,
      pinned: Boolean(data?.pinnedAt), archived: row.archived_at !== null, deleted: row.deleted_at !== null,
      subagent: data?.lineage?.relationshipToParent === "subagent", createdAt: row.created_at, updatedAt: row.updated_at
    }];
  });
}

function readV1Rows(database: DatabaseSync, schema: T3CodeSchemaInfo, resolveProvider: T3CodeProviderResolver): T3CodeThreadRow[] {
  const sessions = schema.tables.has("projection_thread_sessions");
  const runtime = schema.tables.has("provider_session_runtime");
  const sql = `SELECT ${sqliteSelectList(database, "projection_threads", V1_THREAD_COLUMNS, "t")},
      ${sessions ? "s.provider_name" : "NULL"} AS session_provider,
      ${runtime ? "r.provider_name, r.resume_cursor_json, r.runtime_payload_json" : "NULL AS provider_name, NULL AS resume_cursor_json, NULL AS runtime_payload_json"}
    FROM projection_threads t
    ${sessions ? "LEFT JOIN projection_thread_sessions s ON s.thread_id = t.thread_id" : ""}
    ${runtime ? "LEFT JOIN provider_session_runtime r ON r.thread_id = t.thread_id" : ""}
    ORDER BY t.created_at`;
  return database.prepare(sql).all().flatMap((raw): T3CodeThreadRow[] => {
    const parsed = v1RowSchema.safeParse(raw);
    if (!parsed.success) return [];
    const row = parsed.data;
    const model = parseT3CodeModelSelection(row.model_selection_json, resolveProvider);
    const sourceProvider = row.provider_name ?? row.session_provider;
    return [{
      threadId: row.thread_id, projectId: row.project_id, title: row.title,
      provider: sourceProvider ? resolveProvider(sourceProvider) : model ?? resolveProvider("codex"), model: model?.model,
      nativeSessionId: resumeCursorId(row.resume_cursor_json), runtimeCwd: runtimeCwd(row.runtime_payload_json),
      branch: row.branch, worktreePath: row.worktree_path, pinned: row.pinned_at !== null, archived: row.archived_at !== null,
      deleted: row.deleted_at !== null, subagent: false, createdAt: row.created_at, updatedAt: row.updated_at
    }];
  });
}

function countSkipped(skipped: AppImportSkippedItem[], count: number, label: string, reason: string): void {
  if (count > 0) skipped.push({ kind: "thread", label: `${count} ${label}`, reason });
}

export function readT3CodeThreads(database: DatabaseSync, schema: T3CodeSchemaInfo, projects: T3CodeProjects, resolveProvider: T3CodeProviderResolver): T3CodeThreads {
  const rows = schema.schema === "v2" ? readV2Rows(database, schema, resolveProvider) : readV1Rows(database, schema, resolveProvider);
  const candidates: AppImportThreadCandidate[] = [];
  const sourceThreadIds = new Map<string, string>();
  let deleted = 0;
  let subagents = 0;
  let orphaned = 0;
  for (const row of rows) {
    if (row.deleted) { deleted++; continue; }
    if (row.subagent) { subagents++; continue; }
    const project = projects.byProjectId.get(row.projectId);
    if (!project) { orphaned++; continue; }
    const createdAt = toIsoTimestamp(row.createdAt, new Date(0).toISOString());
    const importKey = appImportKey("t3-code", "thread", row.threadId);
    const branch = row.branch?.trim();
    const worktreePath = row.worktreePath?.trim();
    candidates.push({
      importKey, workspaceImportKey: project.importKey, title: row.title.trim() || "Untitled thread",
      provider: row.provider.provider, sourceProvider: row.provider.sourceProvider,
      ...(row.model ? { model: row.model } : {}), ...(row.nativeSessionId ? { nativeSessionId: row.nativeSessionId } : {}),
      cwd: worktreePath || row.runtimeCwd || project.path, ...(branch ? { branch } : {}), ...(worktreePath ? { worktreePath } : {}),
      pinned: row.pinned, archived: row.archived, createdAt, updatedAt: toIsoTimestamp(row.updatedAt, createdAt)
    });
    sourceThreadIds.set(importKey, row.threadId);
  }
  const skipped: AppImportSkippedItem[] = [];
  countSkipped(skipped, deleted, "deleted threads", "Deleted in T3 Code.");
  countSkipped(skipped, subagents, "subagent threads", "Subagent threads belong to their parent thread and are not imported separately.");
  countSkipped(skipped, orphaned, "threads without a project", "Their project was deleted or is missing.");
  return { candidates, sourceThreadIds, skipped };
}

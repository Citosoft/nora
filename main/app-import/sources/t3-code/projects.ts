import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { isDirectory } from "@main/app-import/fileSystem";
import { appImportKey } from "@main/app-import/importKey";
import { sqliteSelectList } from "@main/app-import/readonlySqlite";
import type { AppImportSetupScript, AppImportSkippedItem, AppImportTerminalPreset, AppImportWorkspace } from "@shared/types/app-import/appImportPlan.types";
import type { T3CodeProjectLink, T3CodeProjects, T3CodeProviderResolver } from "@main/types/app-import/t3Code.types";
import { parseJson, parseT3CodeModelSelection } from "./modelSelection";

const PROJECT_COLUMNS = ["project_id", "title", "workspace_root", "scripts_json", "deleted_at", "archived_at", "pinned_at", "default_model_selection_json"] as const;
const projectRowSchema = z.object({
  project_id: z.string(),
  title: z.string(),
  workspace_root: z.string(),
  scripts_json: z.string().nullable(),
  deleted_at: z.string().nullable(),
  archived_at: z.string().nullable(),
  pinned_at: z.string().nullable(),
  default_model_selection_json: z.string().nullable()
});
/** Project scripts (t3code packages/contracts ProjectScript); `runOnWorktreeCreate` marks setup scripts. */
const projectScriptSchema = z.object({ id: z.string().min(1), name: z.string(), command: z.string().trim().min(1), runOnWorktreeCreate: z.boolean().optional().catch(undefined) });

export async function readT3CodeProjects(database: DatabaseSync, resolveProvider: T3CodeProviderResolver): Promise<T3CodeProjects> {
  const rows = database.prepare(`SELECT ${sqliteSelectList(database, "projection_projects", PROJECT_COLUMNS)} FROM projection_projects ORDER BY title`).all();
  const workspaces: AppImportWorkspace[] = [];
  const setupScripts: AppImportSetupScript[] = [];
  const terminalPresets: AppImportTerminalPreset[] = [];
  const skipped: AppImportSkippedItem[] = [];
  const byProjectId = new Map<string, T3CodeProjectLink>();
  for (const raw of rows) {
    const parsed = projectRowSchema.safeParse(raw);
    if (!parsed.success) continue;
    const row = parsed.data;
    const name = row.title.trim() || row.workspace_root;
    if (row.deleted_at) {
      skipped.push({ kind: "workspace", label: name, reason: "Deleted in T3 Code." });
      continue;
    }
    const importKey = appImportKey("t3-code", "workspace", row.project_id);
    const defaultModel = parseT3CodeModelSelection(row.default_model_selection_json, resolveProvider);
    workspaces.push({ importKey, name, path: row.workspace_root, pathExists: await isDirectory(row.workspace_root), pinned: row.pinned_at !== null, archived: row.archived_at !== null, ...(defaultModel ? { defaultModel } : {}) });
    byProjectId.set(row.project_id, { importKey, path: row.workspace_root });
    const scripts = parseJson(row.scripts_json);
    for (const entry of Array.isArray(scripts) ? scripts : []) {
      const script = projectScriptSchema.safeParse(entry);
      if (!script.success) continue;
      const label = script.data.name.trim() || script.data.command;
      if (script.data.runOnWorktreeCreate) {
        setupScripts.push({ importKey: appImportKey("t3-code", "setupScript", row.project_id, script.data.id), workspaceImportKey: importKey, phase: "setup", label, command: script.data.command, origin: "appSettings" });
      } else {
        terminalPresets.push({ importKey: appImportKey("t3-code", "terminalPreset", row.project_id, script.data.id), workspaceImportKey: importKey, label, origin: "projectScript", action: "command", command: script.data.command, appendEnter: true });
      }
    }
  }
  return { workspaces, setupScripts, terminalPresets, skipped, byProjectId };
}

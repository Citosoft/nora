import type { AppImportItemOutcome } from "@shared/types/app-import/appImportApply.types";
import type { AppImportKey, AppImportScriptPhase, AppImportSetupScript } from "@shared/types/app-import/appImportPlan.types";
import type { WorkspaceSetupScriptInput, WorkspaceSetupScriptTrigger } from "@shared/types/workspaceSetupScript.types";
import type { AppImportItemApplier } from "@main/types/app-import/appImportApply.types";
import { APPLIED, failed } from "./outcomes";

const TRIGGERS: Readonly<Record<AppImportScriptPhase, WorkspaceSetupScriptTrigger>> = { setup: "worktree-create", archive: "worktree-archive" };

function scriptInput(script: AppImportSetupScript, importerId: string): WorkspaceSetupScriptInput {
  return { name: script.label, command: script.command, trigger: TRIGGERS[script.phase], origin: { kind: "imported", importerId, externalId: script.importKey } };
}

/**
 * Saves each project's scripts as owned by the source app. Saving replaces that importer's earlier scripts
 * for the project, so scripts a previous run imported are written again alongside the newly ticked ones.
 */
export const applySetupScripts: AppImportItemApplier<"setupScript"> = async (items, context, deps) => {
  const outcomes = new Map<AppImportKey, AppImportItemOutcome>();
  const importerId = context.plan.source.id;
  const selected = new Set(items.map(({ importKey }) => importKey));
  const byWorkspace = new Map<AppImportKey, AppImportSetupScript[]>();
  for (const { item } of items) byWorkspace.set(item.workspaceImportKey, [...byWorkspace.get(item.workspaceImportKey) ?? [], item]);
  for (const [workspaceKey, scripts] of byWorkspace) {
    const project = context.projects.get(workspaceKey);
    if (!project) {
      for (const script of scripts) outcomes.set(script.importKey, { status: "failed", message: "Import this script's workspace first." });
      continue;
    }
    context.report(`Saving setup scripts for ${context.workspaces.get(workspaceKey)?.name ?? "a workspace"}`);
    const kept = context.plan.setupScripts.filter((script) => script.workspaceImportKey === workspaceKey && !selected.has(script.importKey) && context.importedKeys.has(script.importKey));
    try {
      await deps.setupScripts.saveImported(project.id, importerId, [...kept, ...scripts].map((script) => scriptInput(script, importerId)));
      for (const script of scripts) outcomes.set(script.importKey, APPLIED);
    } catch (error) {
      for (const script of scripts) outcomes.set(script.importKey, failed(error, "Nora couldn't save these setup scripts."));
    }
  }
  return { outcomes };
};

import type { AppImportItemOutcome } from "@shared/types/app-import/appImportApply.types";
import type { AppImportKey } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportApplyContext, AppImportApplyDeps, AppImportItemApplier, AppImportProject } from "@main/types/app-import/appImportApply.types";
import { APPLIED, failed, skipped } from "./outcomes";

/** Links every plan workspace whose folder is already a Nora project, whether or not it is ticked. */
async function linkExistingProjects(context: AppImportApplyContext, deps: AppImportApplyDeps): Promise<void> {
  const byPath = new Map<string, AppImportProject>();
  for (const project of deps.projects.list()) byPath.set(await deps.canonicalPath(project.rootPath), project);
  for (const workspace of context.plan.workspaces) {
    const project = byPath.get(await deps.canonicalPath(workspace.path));
    if (project) context.projects.set(workspace.importKey, project);
  }
}

/** Adds ticked folders as Nora projects; the caller reopens whichever project was active before. */
export const applyWorkspaces: AppImportItemApplier<"workspace"> = async (items, context, deps) => {
  await linkExistingProjects(context, deps);
  const outcomes = new Map<AppImportKey, AppImportItemOutcome>();
  for (const { item } of items) {
    context.report(`Adding ${item.name}`);
    if (context.projects.has(item.importKey)) {
      outcomes.set(item.importKey, { status: "alreadyImported" });
      continue;
    }
    if (!item.pathExists) {
      outcomes.set(item.importKey, skipped("This folder no longer exists on this computer."));
      continue;
    }
    try {
      const result = await deps.projects.open(item.path);
      if (result.status === "failed") {
        outcomes.set(item.importKey, { status: "failed", message: result.message });
        continue;
      }
      context.projects.set(item.importKey, result.project);
      outcomes.set(item.importKey, APPLIED);
    } catch (error) {
      outcomes.set(item.importKey, failed(error, "Nora couldn't open this folder."));
    }
  }
  return { outcomes };
};

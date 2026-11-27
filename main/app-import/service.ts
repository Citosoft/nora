import { listAppImportPlanItems } from "@shared/app-import/planItems";
import type { AppImportSourcePreview } from "@shared/types/app-import/appImportApply.types";
import type { AppImportKey, AppImportPlan, AppImportReadResult } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportDetectedSourceId, AppImportDetectionFailure, AppImportSourceId } from "@shared/types/app-import/appImportSource.types";
import type { AppImportSourceSelection } from "@shared/types/app-import/appImportApply.types";
import type { AppImportService, AppImportServiceDeps } from "@main/types/app-import/appImportService.types";
import { applyAppImportPlans, type AppImportPlanSelection } from "./apply/applyPlan";
import { readBotExport } from "./bot-export/readBotExport";
import { appImportSources, readAppImportPlan } from "./registry";
import { createExternalSessionLookup } from "./sessionLookup";

/** Ledger entries plus plan workspaces whose folder is already a Nora project. */
async function alreadyImported(plan: AppImportPlan, ledgerKeys: ReadonlySet<AppImportKey>, projectPaths: ReadonlySet<string>, deps: AppImportServiceDeps): Promise<AppImportKey[]> {
  const keys = new Set(ledgerKeys);
  for (const workspace of plan.workspaces) if (projectPaths.has(await deps.apply.canonicalPath(workspace.path))) keys.add(workspace.importKey);
  return [...keys];
}

function unreadable(source: AppImportSourceId, error: unknown): AppImportDetectionFailure {
  return { status: "unreadable", source, dataPath: "", reason: error instanceof Error && error.message ? error.message : "Nora couldn't read this app's data." };
}

/** Reads every source app on demand and applies one import at a time. */
export function createAppImportService(deps: AppImportServiceDeps): AppImportService {
  let applying = false;
  const read = async (source: AppImportDetectedSourceId): Promise<AppImportReadResult> => {
    try {
      return await readAppImportPlan(source, { env: deps.environment(), sessions: createExternalSessionLookup(deps.sessionReaders()) });
    } catch (error) {
      return unreadable(source, error);
    }
  };
  const readSelection = async (selection: AppImportSourceSelection): Promise<AppImportReadResult> =>
    selection.source === "bot-export" ? readBotExport(selection.document) : await read(selection.source);
  return {
    async preview(sources) {
      const wanted = sources ? appImportSources.filter((source) => sources.includes(source.id)) : appImportSources;
      const [results, ledgerKeys, projectPaths] = await Promise.all([
        Promise.all(wanted.map(async (source) => await read(source.id))),
        deps.apply.ledger.importedKeys(),
        Promise.all(deps.apply.projects.list().map(async (project) => await deps.apply.canonicalPath(project.rootPath))).then((paths) => new Set(paths))
      ]);
      const previews = await Promise.all(results.map(async (result): Promise<AppImportSourcePreview> => result.status === "ready"
        ? { status: "ready", source: result.plan.source.id, plan: result.plan, importedKeys: await alreadyImported(result.plan, ledgerKeys, projectPaths, deps) }
        : result));
      return { sources: previews };
    },
    async previewBotExport(document) {
      const result = readBotExport(document);
      if (result.status !== "ready") return result;
      return { status: "ready", source: "bot-export", plan: result.plan, importedKeys: [...await deps.apply.ledger.importedKeys()] };
    },
    async apply(request) {
      if (applying) throw new Error("An import is already running.");
      applying = true;
      try {
        const selections: AppImportPlanSelection[] = [];
        const unavailable: AppImportDetectionFailure[] = [];
        for (const selection of request.selections) {
          const { selectedKeys } = selection;
          if (!selectedKeys.length) continue;
          // Re-read rather than trust a plan from the window: apply only ever acts on what is on disk (or pasted) now.
          const result = await readSelection(selection);
          if (result.status !== "ready") {
            unavailable.push(result);
            continue;
          }
          const selectable = new Set(listAppImportPlanItems(result.plan, new Set()).map((item) => item.importKey));
          selections.push({ plan: result.plan, selectedKeys: new Set(selectedKeys.filter((key) => selectable.has(key))) });
        }
        const output = await applyAppImportPlans(selections, { ...deps.apply, onProgress: (progress) => deps.onProgress({ ...progress, runId: request.runId }) });
        return { ...output, unavailable };
      } finally {
        applying = false;
      }
    }
  };
}

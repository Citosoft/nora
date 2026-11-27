import type { AppImportItemOutcome } from "@shared/types/app-import/appImportApply.types";
import type { AppImportEnvVar, AppImportKey } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportItemApplier } from "@main/types/app-import/appImportApply.types";
import { APPLIED, failed, skipped } from "./outcomes";

function purpose(envVar: AppImportEnvVar, sourceName: string): string {
  const scope = envVar.scope.kind === "provider" ? ` for ${envVar.scope.provider.sourceProvider}` : "";
  return `Environment variable imported from ${sourceName}${scope}.`;
}

/**
 * Environment values may hold credentials, so they only ever land in Nora's keychain-backed secrets, and
 * only when the user ticked them. An existing secret of the same name is never overwritten.
 */
export const applyEnvVars: AppImportItemApplier<"envVar"> = async (items, context, deps) => {
  const outcomes = new Map<AppImportKey, AppImportItemOutcome>();
  for (const { item } of items) {
    context.report(`Saving secret ${item.name}`);
    const location = { name: item.name, projectId: null };
    if (deps.secrets.has(location)) {
      outcomes.set(item.importKey, skipped("A secret with this name already exists in Nora."));
      continue;
    }
    try {
      deps.secrets.save({ ...location, purpose: purpose(item, context.plan.source.displayName), value: item.value });
      outcomes.set(item.importKey, APPLIED);
    } catch (error) {
      outcomes.set(item.importKey, failed(error, "Nora couldn't save this secret."));
    }
  }
  return { outcomes };
};

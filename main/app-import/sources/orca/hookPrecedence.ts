import type { AppImportScriptPhase, AppImportSetupScript } from "@shared/types/app-import/appImportPlan.types";
import type { OrcaHookCommandSourcePolicy } from "@main/types/app-import/orca.types";

/** Orca's resolveHookCommandSourcePolicy: an explicit policy wins; otherwise a local script means local-only. */
function resolvePolicy(policy: OrcaHookCommandSourcePolicy | undefined, hasLocalScript: boolean): OrcaHookCommandSourcePolicy {
  return policy ?? (hasLocalScript ? "local-only" : "shared-only");
}

/**
 * Keeps only the setup scripts Orca would actually run for each phase (effective-hook-config.ts): the
 * repo's orca.yaml script, its locally stored script, or both in that order under `run-both`.
 */
export function effectiveOrcaSetupScripts(local: readonly AppImportSetupScript[], repoFile: readonly AppImportSetupScript[], policy: OrcaHookCommandSourcePolicy | undefined): AppImportSetupScript[] {
  return (["setup", "archive"] as const satisfies readonly AppImportScriptPhase[]).flatMap((phase) => {
    const localScripts = local.filter((script) => script.phase === phase);
    const sharedScripts = repoFile.filter((script) => script.phase === phase);
    switch (resolvePolicy(policy, localScripts.length > 0)) {
      case "local-only": return localScripts;
      case "shared-only": return sharedScripts;
      case "run-both": return [...sharedScripts, ...localScripts];
    }
  });
}

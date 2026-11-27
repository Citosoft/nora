import path from "node:path";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";

/** Database files in preference order: v2 store first, then the legacy v1 store. */
export const T3_CODE_DATABASE_FILES = ["statev2.sqlite", "state.sqlite"] as const;

/**
 * T3 Code keeps state under `<base>/userdata` (`<base>/dev` for development builds), with base
 * `~/.t3` unless `T3CODE_HOME` overrides it (t3code scripts/dev-runner.ts).
 */
export function t3CodeStateDirectories(env: AppImportEnvironment): string[] {
  const base = env.variables.T3CODE_HOME?.trim() || path.join(env.homeDir, ".t3");
  return [path.join(base, "userdata"), path.join(base, "dev")];
}

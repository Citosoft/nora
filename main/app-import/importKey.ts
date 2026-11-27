import type { AppImportSourceId } from "@shared/types/app-import/appImportSource.types";
import type { AppImportKey } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportKeyKind } from "@main/types/app-import/appImportSource.types";

/** Deterministic key from source-native ids; ids are URI-encoded so a `:` inside one cannot alias another key. */
export function appImportKey(source: AppImportSourceId, kind: AppImportKeyKind, ...ids: readonly string[]): AppImportKey {
  return [source, kind, ...ids.map(encodeURIComponent)].join(":");
}

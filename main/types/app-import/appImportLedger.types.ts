import type { AppImportKey } from "@shared/types/app-import/appImportPlan.types";

export interface AppImportLedgerFile {
  version: 1;
  entries: Record<AppImportKey, { importedAt: string }>;
}

export interface AppImportLedger {
  importedKeys(): Promise<ReadonlySet<AppImportKey>>;
  record(keys: readonly AppImportKey[]): Promise<void>;
}

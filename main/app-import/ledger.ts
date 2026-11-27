import { z } from "zod";
import type { JsonFileStore } from "@main/types/jsonFileStore.types";
import type { AppImportLedger, AppImportLedgerFile } from "@main/types/app-import/appImportLedger.types";

export const EMPTY_APP_IMPORT_LEDGER: AppImportLedgerFile = { version: 1, entries: {} };

const ledgerSchema = z.object({ version: z.literal(1), entries: z.record(z.string(), z.object({ importedAt: z.string() })) });

export function normalizeAppImportLedger(value: unknown): AppImportLedgerFile {
  return ledgerSchema.parse(value);
}

/** Import keys are recorded only after their item was applied, so a failed item is offered again next time. */
export function createAppImportLedger(store: JsonFileStore<AppImportLedgerFile>, now: () => string): AppImportLedger {
  return {
    async importedKeys() {
      return new Set(Object.keys((await store.load()).entries));
    },
    async record(keys) {
      if (!keys.length) return;
      const file = await store.load();
      const importedAt = now();
      await store.save({ version: 1, entries: { ...file.entries, ...Object.fromEntries(keys.map((key) => [key, { importedAt }])) } });
    }
  };
}

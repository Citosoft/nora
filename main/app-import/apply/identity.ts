import { createHash } from "node:crypto";
import type { AppImportKey } from "@shared/types/app-import/appImportPlan.types";

/**
 * Stable Nora ids for an imported item: re-running the same import yields the same conversation and
 * command ids, so the execution host recognises a repeat instead of creating a duplicate.
 */
export function appImportIdentity(importKey: AppImportKey, ...parts: string[]): string {
  return `app-import:${createHash("sha256").update(JSON.stringify([importKey, ...parts])).digest("hex")}`;
}

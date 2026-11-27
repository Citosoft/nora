import type { AppImportItemOutcome } from "@shared/types/app-import/appImportApply.types";

export const APPLIED: AppImportItemOutcome = { status: "applied" };

export function failed(error: unknown, fallback: string): AppImportItemOutcome {
  return { status: "failed", message: error instanceof Error && error.message ? error.message : fallback };
}

export function skipped(reason: string): AppImportItemOutcome {
  return { status: "skipped", reason };
}

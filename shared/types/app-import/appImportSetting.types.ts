import type { AppImportKey, AppImportModelRef, AppImportProviderRef } from "./appImportPlan.types";

/** Settings with a known Nora equivalent. Anything else the source app stores is not carried over. */
export type AppImportSettingValue =
  | { kind: "defaultProvider"; provider: AppImportProviderRef }
  | { kind: "defaultModel"; model: AppImportModelRef }
  | { kind: "cliBinaryPath"; provider: AppImportProviderRef; path: string }
  | { kind: "cliDefaultArgs"; provider: AppImportProviderRef; args: string }
  | { kind: "defaultShell"; shell: string }
  | { kind: "branchPrefix"; prefix: string }
  | { kind: "worktreeBaseDir"; path: string }
  | { kind: "theme"; theme: string };

export type AppImportSettingKind = AppImportSettingValue["kind"];

export type AppImportSetting = AppImportSettingValue & {
  importKey: AppImportKey;
  /** Source app's setting key path, for display and diagnostics (e.g. `settings.json#worktreesDirectory`). */
  sourceKey: string;
};

import { appImportThemeMode } from "@shared/app-import/planItems";
import type { AppImportItemOutcome, AppImportThemeMode } from "@shared/types/app-import/appImportApply.types";
import type { AppImportKey } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportSetting } from "@shared/types/app-import/appImportSetting.types";
import type { NativeProviderKind } from "@shared/types/provider/providerKind.types";
import type { AppImportApplyDeps, AppImportItemApplier } from "@main/types/app-import/appImportApply.types";
import { APPLIED, failed, skipped } from "./outcomes";

const UNSUPPORTED = "Nora has no matching setting.";

/** A default agent without a model takes that agent's first offered model, since Nora's default is a model. */
async function defaultModelFor(kind: NativeProviderKind, model: string | null, deps: AppImportApplyDeps): Promise<AppImportItemOutcome> {
  const boot = deps.conversations.boot();
  const provider = boot.providers.find((entry) => entry.kind === kind);
  if (!provider) return { status: "failed", message: `Set up ${kind === "claude" ? "Claude" : "Codex"} in Nora first.` };
  if (model) {
    await deps.settings.setThreadModel({ kind: provider.kind, instanceId: provider.instanceId, model });
    return APPLIED;
  }
  const workspace = boot.workspaces[0]?.workspace;
  if (!workspace) return { status: "failed", message: "Add a workspace before choosing a default agent." };
  const catalog = await deps.conversations.catalog(provider.kind, provider.instanceId, workspace);
  if (catalog.status === "unavailable") return { status: "failed", message: catalog.failure.message };
  const first = catalog.catalog.models[0];
  if (!first) return { status: "failed", message: `${provider.label} offers no models right now.` };
  await deps.settings.setThreadModel({ kind: provider.kind, instanceId: provider.instanceId, model: first.id });
  return APPLIED;
}

async function applySetting(setting: AppImportSetting, coveredProviders: ReadonlySet<string>, deps: AppImportApplyDeps): Promise<{ outcome: AppImportItemOutcome; themeMode?: AppImportThemeMode }> {
  switch (setting.kind) {
    case "defaultModel":
      if (setting.model.provider === "other") return { outcome: skipped(UNSUPPORTED) };
      return { outcome: await defaultModelFor(setting.model.provider, setting.model.model, deps) };
    case "defaultProvider":
      if (setting.provider.provider === "other") return { outcome: skipped(UNSUPPORTED) };
      // A ticked default model for the same agent already says more.
      if (coveredProviders.has(setting.provider.provider)) return { outcome: APPLIED };
      return { outcome: await defaultModelFor(setting.provider.provider, null, deps) };
    case "theme": {
      const themeMode = appImportThemeMode(setting.theme);
      return themeMode ? { outcome: APPLIED, themeMode } : { outcome: skipped(UNSUPPORTED) };
    }
    case "cliBinaryPath":
    case "cliDefaultArgs":
    case "defaultShell":
    case "branchPrefix":
    case "worktreeBaseDir":
      return { outcome: skipped(UNSUPPORTED) };
  }
}

/** Default model goes to Nora's personalization; the theme is handed back for the window to apply. */
export const applySettings: AppImportItemApplier<"setting"> = async (items, context, deps) => {
  const outcomes = new Map<AppImportKey, AppImportItemOutcome>();
  let themeMode: AppImportThemeMode | null = null;
  const coveredProviders = new Set(items.flatMap(({ item }) => item.kind === "defaultModel" ? [item.model.provider] : []));
  for (const { item, label } of items) {
    context.report(`Applying ${label}`);
    try {
      const result = await applySetting(item, coveredProviders, deps);
      outcomes.set(item.importKey, result.outcome);
      if (result.themeMode) themeMode = result.themeMode;
    } catch (error) {
      outcomes.set(item.importKey, failed(error, "Nora couldn't apply this setting."));
    }
  }
  return { outcomes, renderer: { themeMode } };
};

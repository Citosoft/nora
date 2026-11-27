import { getKeybindingCommand } from "@shared/keybindings/commands";
import type { AppImportItemSupport, AppImportThemeMode } from "@shared/types/app-import/appImportApply.types";
import type { AppImportPlanEntry, AppImportPlanItem } from "@shared/types/app-import/appImportItem.types";
import type { AppImportKey, AppImportPlan, AppImportProviderRef, AppImportTerminalPreset, AppImportThread, AppImportWorkspace } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportSetting } from "@shared/types/app-import/appImportSetting.types";

const SUPPORTED: AppImportItemSupport = { status: "supported" };

function unsupported(reason: string): AppImportItemSupport {
  return { status: "unsupported", reason };
}

/** Nora has light, dark and system appearance; a source theme maps only when its name says which. */
export function appImportThemeMode(theme: string): AppImportThemeMode | null {
  const name = theme.toLowerCase();
  if (name.includes("system") || name.includes("auto")) return "system";
  if (name.includes("dark")) return "dark";
  if (name.includes("light")) return "light";
  return null;
}

function providerName(provider: AppImportProviderRef): string {
  return provider.provider === "other" ? provider.sourceProvider : provider.provider === "claude" ? "Claude" : provider.provider === "codex" ? "Codex" : provider.provider;
}

function settingSupport(setting: AppImportSetting): AppImportItemSupport {
  switch (setting.kind) {
    case "defaultProvider": return setting.provider.provider === "other" ? unsupported(`Nora doesn't run ${setting.provider.sourceProvider}.`) : SUPPORTED;
    case "defaultModel": return setting.model.provider === "other" ? unsupported(`Nora doesn't run ${setting.model.sourceProvider}.`) : SUPPORTED;
    case "cliBinaryPath": return unsupported("Nora finds agent CLIs itself and has no setting for their path.");
    case "cliDefaultArgs": return unsupported("Nora has no setting for default agent CLI arguments.");
    case "defaultShell": return unsupported("Nora has no default shell setting; terminal presets choose their shell.");
    case "branchPrefix": return unsupported("Nora has no branch prefix setting.");
    case "worktreeBaseDir": return unsupported("Nora keeps worktrees in its own folder.");
    case "theme": return appImportThemeMode(setting.theme) ? SUPPORTED : unsupported(`Nora has no theme matching "${setting.theme}".`);
  }
}

function settingLabel(setting: AppImportSetting): string {
  switch (setting.kind) {
    case "defaultProvider": return `Default agent: ${providerName(setting.provider)}`;
    case "defaultModel": return `Default model: ${providerName(setting.model)} ${setting.model.model}`;
    case "cliBinaryPath": return `${providerName(setting.provider)} CLI path: ${setting.path}`;
    case "cliDefaultArgs": return `${providerName(setting.provider)} CLI arguments: ${setting.args}`;
    case "defaultShell": return `Default shell: ${setting.shell}`;
    case "branchPrefix": return `Branch prefix: ${setting.prefix}`;
    case "worktreeBaseDir": return `Worktree folder: ${setting.path}`;
    case "theme": {
      const mode = appImportThemeMode(setting.theme);
      return mode ? `Appearance: ${mode} (from ${setting.theme})` : `Theme: ${setting.theme}`;
    }
  }
}

function threadSupport(thread: AppImportThread): AppImportItemSupport {
  if (thread.resumable) return SUPPORTED;
  if (thread.transcript?.messages.length) return SUPPORTED;
  return unsupported("Its session is gone and the app kept no messages to import.");
}

function presetSupport(preset: AppImportTerminalPreset): AppImportItemSupport {
  return preset.action === "command" ? SUPPORTED : unsupported("Nora presets run shell commands; start agents from a new thread instead.");
}

function workspaceSupport(workspace: AppImportWorkspace): AppImportItemSupport {
  return workspace.pathExists ? SUPPORTED : unsupported("This folder no longer exists on this computer.");
}

function scoped(label: string, workspaceKey: AppImportKey | null, workspaces: ReadonlyMap<AppImportKey, AppImportWorkspace>): string {
  const workspace = workspaceKey ? workspaces.get(workspaceKey) : undefined;
  return workspace ? `${workspace.name}: ${label}` : label;
}

function entryDetails(entry: AppImportPlanEntry, workspaces: ReadonlyMap<AppImportKey, AppImportWorkspace>): { label: string; support: AppImportItemSupport; sensitive: boolean } {
  switch (entry.kind) {
    case "workspace": return { label: entry.item.name, support: workspaceSupport(entry.item), sensitive: false };
    case "thread": return { label: scoped(entry.item.title, entry.item.workspaceImportKey, workspaces), support: threadSupport(entry.item), sensitive: false };
    case "setupScript": return { label: scoped(entry.item.label, entry.item.workspaceImportKey, workspaces), support: SUPPORTED, sensitive: false };
    case "terminalPreset": return { label: scoped(entry.item.label, entry.item.workspaceImportKey, workspaces), support: presetSupport(entry.item), sensitive: false };
    case "setting": return { label: settingLabel(entry.item), support: settingSupport(entry.item), sensitive: false };
    case "keybinding": return { label: `${getKeybindingCommand(entry.item.commandId).title}: ${entry.item.accelerator ?? "unbound"}`, support: SUPPORTED, sensitive: false };
    case "bot": return { label: entry.item.name, support: SUPPORTED, sensitive: false };
    case "envVar": return { label: entry.item.scope.kind === "provider" ? `${providerName(entry.item.scope.provider)}: ${entry.item.name}` : entry.item.name, support: SUPPORTED, sensitive: true };
  }
}

/** Every importable item in apply order: workspaces first, so the scripts, presets and threads that belong to them can find them. */
export function listAppImportPlanItems(plan: AppImportPlan, importedKeys: ReadonlySet<AppImportKey>): AppImportPlanItem[] {
  const workspaces = new Map(plan.workspaces.map((workspace) => [workspace.importKey, workspace]));
  const entries: AppImportPlanEntry[] = [
    ...plan.workspaces.map((item): AppImportPlanEntry => ({ kind: "workspace", item })),
    ...plan.setupScripts.map((item): AppImportPlanEntry => ({ kind: "setupScript", item })),
    ...plan.terminalPresets.map((item): AppImportPlanEntry => ({ kind: "terminalPreset", item })),
    ...plan.threads.map((item): AppImportPlanEntry => ({ kind: "thread", item })),
    ...plan.settings.map((item): AppImportPlanEntry => ({ kind: "setting", item })),
    ...plan.keybindings.map((item): AppImportPlanEntry => ({ kind: "keybinding", item })),
    ...plan.envVars.map((item): AppImportPlanEntry => ({ kind: "envVar", item })),
    ...plan.bots.map((item): AppImportPlanEntry => ({ kind: "bot", item }))
  ];
  return entries.map((entry) => {
    const { label, support, sensitive } = entryDetails(entry, workspaces);
    const importKey = entry.item.importKey;
    return { ...entry, importKey, label, support, selectedByDefault: support.status === "supported" && !sensitive && !importedKeys.has(importKey) };
  });
}

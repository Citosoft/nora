import { z } from "zod";
import { appImportKey } from "@main/app-import/importKey";
import { toProviderRef } from "@main/app-import/providerRef";
import { isSecretLikeName } from "@main/app-import/secretNames";
import type { AppImportEnvVar, AppImportSkippedItem, AppImportTerminalPreset } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportSetting } from "@shared/types/app-import/appImportSetting.types";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";
import type { OrcaRepoLink, OrcaSettings } from "@main/types/app-import/orca.types";

const text = z.string().trim().min(1).optional().catch(undefined);
const stringMap = z.record(z.string(), z.string()).optional().catch(undefined);
const quickCommandSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  scope: z.object({ type: z.string(), repoId: z.string().optional() }).optional().catch(undefined),
  action: z.string().optional(),
  command: z.string().optional(),
  appendEnter: z.boolean().optional().catch(undefined),
  agent: z.string().optional(),
  prompt: z.string().optional()
});
/**
 * Mapped settings only (orca src/shared/settings/global-settings-types.ts). Managed accounts are
 * read solely to count them for the skipped list; their contents never leave this module.
 */
const settingsSchema = z.object({
  theme: text,
  defaultTuiAgent: text.nullable().catch(null),
  agentCmdOverrides: stringMap,
  agentDefaultArgs: stringMap,
  agentDefaultEnv: z.record(z.string(), z.record(z.string(), z.string()).catch({})).optional().catch(undefined),
  terminalDefaultShell: text,
  terminalWindowsShell: text,
  terminalQuickCommands: z.array(z.unknown()).optional().catch(undefined),
  branchPrefix: z.enum(["git-username", "custom", "none"]).optional().catch(undefined),
  branchPrefixCustom: z.string().optional().catch(undefined),
  workspaceDir: text,
  claudeManagedAccounts: z.array(z.unknown()).optional().catch(undefined),
  codexManagedAccounts: z.array(z.unknown()).optional().catch(undefined)
});

function quickCommandPresets(raw: readonly unknown[], byRepoId: ReadonlyMap<string, OrcaRepoLink>): AppImportTerminalPreset[] {
  return raw.flatMap((entry): AppImportTerminalPreset[] => {
    const parsed = quickCommandSchema.safeParse(entry);
    if (!parsed.success) return [];
    const quick = parsed.data;
    const repo = quick.scope?.type === "repo" && quick.scope.repoId ? byRepoId.get(quick.scope.repoId) : undefined;
    // Repo-scoped commands for repos that are not imported have nowhere to go.
    if (quick.scope?.type === "repo" && !repo) return [];
    const base = { importKey: appImportKey("orca", "terminalPreset", "quickCommand", quick.id), workspaceImportKey: repo?.importKey ?? null, label: quick.label.trim() || quick.id, origin: "quickCommand" as const };
    if (quick.action === "agent-prompt") return quick.agent && quick.prompt ? [{ ...base, action: "agentPrompt", agent: toProviderRef(quick.agent), prompt: quick.prompt }] : [];
    return quick.command?.trim() ? [{ ...base, action: "command", command: quick.command, appendEnter: quick.appendEnter ?? true }] : [];
  });
}

export function readOrcaSettings(raw: unknown, env: AppImportEnvironment, byRepoId: ReadonlyMap<string, OrcaRepoLink>): OrcaSettings {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { settings: [], envVars: [], terminalPresets: [], skipped: [] };
  const source = parsed.data;
  const settings: AppImportSetting[] = [];
  const envVars: AppImportEnvVar[] = [];
  const skipped: AppImportSkippedItem[] = [];
  if (source.theme) settings.push({ kind: "theme", theme: source.theme, importKey: appImportKey("orca", "setting", "theme"), sourceKey: "settings.theme" });
  if (source.defaultTuiAgent && source.defaultTuiAgent !== "blank") {
    settings.push({ kind: "defaultProvider", provider: toProviderRef(source.defaultTuiAgent), importKey: appImportKey("orca", "setting", "defaultProvider"), sourceKey: "settings.defaultTuiAgent" });
  }
  for (const [agent, command] of Object.entries(source.agentCmdOverrides ?? {})) {
    if (command.trim()) settings.push({ kind: "cliBinaryPath", provider: toProviderRef(agent), path: command.trim(), importKey: appImportKey("orca", "setting", "cliBinaryPath", agent), sourceKey: `settings.agentCmdOverrides.${agent}` });
  }
  for (const [agent, args] of Object.entries(source.agentDefaultArgs ?? {})) {
    if (args.trim()) settings.push({ kind: "cliDefaultArgs", provider: toProviderRef(agent), args: args.trim(), importKey: appImportKey("orca", "setting", "cliDefaultArgs", agent), sourceKey: `settings.agentDefaultArgs.${agent}` });
  }
  const shell = env.platform === "win32" ? source.terminalWindowsShell ?? source.terminalDefaultShell : source.terminalDefaultShell;
  if (shell) settings.push({ kind: "defaultShell", shell, importKey: appImportKey("orca", "setting", "defaultShell"), sourceKey: env.platform === "win32" && source.terminalWindowsShell ? "settings.terminalWindowsShell" : "settings.terminalDefaultShell" });
  if (source.branchPrefix === "custom" || source.branchPrefix === "none") {
    settings.push({ kind: "branchPrefix", prefix: source.branchPrefix === "custom" ? source.branchPrefixCustom?.trim() ?? "" : "", importKey: appImportKey("orca", "setting", "branchPrefix"), sourceKey: "settings.branchPrefix" });
  } else if (source.branchPrefix === "git-username") {
    skipped.push({ kind: "setting", label: "Branch prefix from Git username", reason: "Nora uses a fixed branch prefix; set one in Nora's settings." });
  }
  if (source.workspaceDir) settings.push({ kind: "worktreeBaseDir", path: source.workspaceDir, importKey: appImportKey("orca", "setting", "worktreeBaseDir"), sourceKey: "settings.workspaceDir" });
  for (const [agent, variables] of Object.entries(source.agentDefaultEnv ?? {})) {
    for (const [name, value] of Object.entries(variables)) {
      if (isSecretLikeName(name)) {
        skipped.push({ kind: "secret", label: `${agent} environment variable ${name}`, reason: "Secret environment values are never imported." });
        continue;
      }
      envVars.push({ importKey: appImportKey("orca", "envVar", agent, name), name, value, scope: { kind: "provider", provider: toProviderRef(agent) }, sensitive: true, selectedByDefault: false });
    }
  }
  const accounts = (source.claudeManagedAccounts?.length ?? 0) + (source.codexManagedAccounts?.length ?? 0);
  if (accounts > 0) skipped.push({ kind: "account", label: `${accounts} managed Claude/Codex accounts`, reason: "Accounts and their credentials are never imported." });
  return { settings, envVars, terminalPresets: quickCommandPresets(source.terminalQuickCommands ?? [], byRepoId), skipped };
}

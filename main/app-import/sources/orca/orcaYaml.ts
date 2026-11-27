import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { readTextFile } from "@main/app-import/fileSystem";
import { appImportKey } from "@main/app-import/importKey";
import type { AppImportSetupScript, AppImportTerminalPreset } from "@shared/types/app-import/appImportPlan.types";
import type { OrcaRepoFile } from "@main/types/app-import/orca.types";

const commandSchema = z.string().trim().min(1).optional().catch(undefined);
/** Committed per-repo hooks (orca src/shared/workspace-setup/orca-yaml-hook-types.ts `OrcaHooks`). */
const orcaYamlSchema = z.object({
  scripts: z.object({ setup: commandSchema, archive: commandSchema }).optional().catch(undefined),
  defaultTabs: z.array(z.object({ title: z.string().optional().catch(undefined), command: commandSchema }).catch({ title: undefined, command: undefined })).optional().catch(undefined)
});

export async function readOrcaYaml(repoId: string, repoPath: string, workspaceImportKey: string): Promise<OrcaRepoFile> {
  const file = await readTextFile(path.join(repoPath, "orca.yaml"));
  if (file.status === "missing") return { setupScripts: [], terminalPresets: [], warnings: [] };
  let value: unknown;
  try {
    value = file.status === "ok" ? parse(file.text) : undefined;
  } catch {
    value = undefined;
  }
  const parsed = orcaYamlSchema.safeParse(value);
  if (!parsed.success) return { setupScripts: [], terminalPresets: [], warnings: [`orca.yaml in ${path.basename(repoPath)} could not be read; its scripts were not imported.`] };
  const setupScripts: AppImportSetupScript[] = [];
  for (const phase of ["setup", "archive"] as const) {
    const command = parsed.data.scripts?.[phase];
    if (command) setupScripts.push({ importKey: appImportKey("orca", "setupScript", repoId, "orca.yaml", phase), workspaceImportKey, phase, label: `orca.yaml ${phase}`, command, origin: "repoFile" });
  }
  const terminalPresets: AppImportTerminalPreset[] = (parsed.data.defaultTabs ?? []).flatMap((tab, index): AppImportTerminalPreset[] => tab.command
    ? [{ importKey: appImportKey("orca", "terminalPreset", repoId, "defaultTab", String(index)), workspaceImportKey, label: tab.title?.trim() || tab.command, origin: "defaultTab", action: "command", command: tab.command, appendEnter: true }]
    : []);
  return { setupScripts, terminalPresets, warnings: [] };
}

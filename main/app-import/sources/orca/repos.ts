import { z } from "zod";
import { isDirectory } from "@main/app-import/fileSystem";
import { appImportKey } from "@main/app-import/importKey";
import type { AppImportSetupScript, AppImportSkippedItem, AppImportTerminalPreset, AppImportWorkspace } from "@shared/types/app-import/appImportPlan.types";
import type { OrcaRepoLink, OrcaRepos } from "@main/types/app-import/orca.types";
import { effectiveOrcaSetupScripts } from "./hookPrecedence";
import { readOrcaYaml } from "./orcaYaml";

const repoSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  displayName: z.string().optional().catch(undefined),
  /** SSH repos carry a connection id; runtime-host repos an execution host other than local. */
  connectionId: z.string().nullable().optional().catch(null),
  executionHostId: z.string().nullable().optional().catch(null),
  hookSettings: z.object({
    scripts: z.object({ setup: z.string().optional().catch(undefined), archive: z.string().optional().catch(undefined) }).optional().catch(undefined),
    commandSourcePolicy: z.enum(["local-only", "shared-only", "run-both"]).optional().catch(undefined)
  }).optional().catch(undefined)
});

export async function readOrcaRepos(raw: unknown): Promise<OrcaRepos> {
  const workspaces: AppImportWorkspace[] = [];
  const setupScripts: AppImportSetupScript[] = [];
  const terminalPresets: AppImportTerminalPreset[] = [];
  const skipped: AppImportSkippedItem[] = [];
  const warnings: string[] = [];
  const byRepoId = new Map<string, OrcaRepoLink>();
  for (const entry of Array.isArray(raw) ? raw : []) {
    const parsed = repoSchema.safeParse(entry);
    if (!parsed.success) continue;
    const repo = parsed.data;
    const name = repo.displayName?.trim() || repo.path.split(/[\\/]/).filter(Boolean).pop() || repo.path;
    if (repo.connectionId || (repo.executionHostId && repo.executionHostId !== "local")) {
      skipped.push({ kind: "remoteWorkspace", label: name, reason: "Repositories on SSH or remote hosts are not imported." });
      continue;
    }
    const importKey = appImportKey("orca", "workspace", repo.id);
    workspaces.push({ importKey, name, path: repo.path, pathExists: await isDirectory(repo.path), pinned: false, archived: false });
    byRepoId.set(repo.id, { repoId: repo.id, importKey, path: repo.path });
    const localScripts = (["setup", "archive"] as const).flatMap((phase): AppImportSetupScript[] => {
      const command = repo.hookSettings?.scripts?.[phase]?.trim();
      return command ? [{ importKey: appImportKey("orca", "setupScript", repo.id, "settings", phase), workspaceImportKey: importKey, phase, label: `Orca ${phase} script`, command, origin: "appSettings" }] : [];
    });
    const repoFile = await readOrcaYaml(repo.id, repo.path, importKey);
    setupScripts.push(...effectiveOrcaSetupScripts(localScripts, repoFile.setupScripts, repo.hookSettings?.commandSourcePolicy));
    terminalPresets.push(...repoFile.terminalPresets);
    warnings.push(...repoFile.warnings);
  }
  return { workspaces, setupScripts, terminalPresets, skipped, byRepoId, warnings };
}

import type { AppImportItemOutcome } from "@shared/types/app-import/appImportApply.types";
import type { AppImportKey, AppImportTerminalPreset } from "@shared/types/app-import/appImportPlan.types";
import type { TerminalPreset } from "@shared/types/system.types";
import type { AppImportItemApplier } from "@main/types/app-import/appImportApply.types";
import { appImportIdentity } from "./identity";
import { APPLIED, failed, skipped } from "./outcomes";

/** Presets have no owner field, so imported ones get ids derived from their import key and replace themselves on a re-run. */
function presetFor(preset: AppImportTerminalPreset & { action: "command" }): TerminalPreset {
  return { id: appImportIdentity(preset.importKey), name: preset.label, workingDirectory: "", commands: [preset.command] };
}

function merged(existing: readonly TerminalPreset[], added: readonly TerminalPreset[]): TerminalPreset[] {
  const ids = new Set(added.map((preset) => preset.id));
  return [...existing.filter((preset) => !ids.has(preset.id)), ...added];
}

/** Adds command presets to their workspace, or to the global presets when the source offered them everywhere. */
export const applyTerminalPresets: AppImportItemApplier<"terminalPreset"> = async (items, context, deps) => {
  const outcomes = new Map<AppImportKey, AppImportItemOutcome>();
  const groups = new Map<AppImportKey | null, { importKey: AppImportKey; preset: TerminalPreset }[]>();
  for (const { item } of items) {
    if (item.action !== "command") {
      outcomes.set(item.importKey, skipped("Nora presets run shell commands; start agents from a new thread instead."));
      continue;
    }
    groups.set(item.workspaceImportKey, [...groups.get(item.workspaceImportKey) ?? [], { importKey: item.importKey, preset: presetFor(item) }]);
  }
  for (const [workspaceKey, entries] of groups) {
    const presets = entries.map(({ preset }) => preset);
    const project = workspaceKey ? context.projects.get(workspaceKey) : null;
    if (workspaceKey && !project) {
      for (const { importKey } of entries) outcomes.set(importKey, { status: "failed", message: "Import this preset's workspace first." });
      continue;
    }
    context.report(project ? `Saving presets for ${context.workspaces.get(workspaceKey ?? "")?.name ?? "a workspace"}` : "Saving global presets");
    try {
      if (project) await deps.terminalPresets.saveWorkspacePresets(project.id, merged(deps.terminalPresets.workspacePresets(project.id), presets));
      else await deps.terminalPresets.saveGlobalPresets(merged(deps.terminalPresets.globalPresets(), presets));
      for (const { importKey } of entries) outcomes.set(importKey, APPLIED);
    } catch (error) {
      for (const { importKey } of entries) outcomes.set(importKey, failed(error, "Nora couldn't save these presets."));
    }
  }
  return { outcomes };
};

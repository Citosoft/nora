import { listAppImportPlanItems } from "@shared/app-import/planItems";
import type { AppImportItemOutcome, AppImportItemResult, AppImportRendererChanges } from "@shared/types/app-import/appImportApply.types";
import type { AppImportPlanItem } from "@shared/types/app-import/appImportItem.types";
import type { AppImportKey, AppImportPlan } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportApplyContext, AppImportApplyDeps, AppImportItemApplier, AppImportStepResult } from "@main/types/app-import/appImportApply.types";
import { applyBots } from "./bots";
import { applyEnvVars } from "./envVars";
import { applyKeybindings } from "./keybindings";
import { failed, skipped } from "./outcomes";
import { applySettings } from "./settings";
import { applySetupScripts } from "./setupScripts";
import { applyTerminalPresets } from "./terminalPresets";
import { applyThreads } from "./threads";
import { applyWorkspaces } from "./workspaces";

type Kind = AppImportPlanItem["kind"];
type ItemOf<K extends Kind> = Extract<AppImportPlanItem, { kind: K }>;

function itemsOfKind<K extends Kind>(items: readonly AppImportPlanItem[], kind: K): ItemOf<K>[] {
  return items.filter((item): item is ItemOf<K> => item.kind === kind);
}

interface AppImportStep {
  kind: Kind;
  apply(items: readonly AppImportPlanItem[], context: AppImportApplyContext, deps: AppImportApplyDeps): Promise<AppImportStepResult>;
}

function step<K extends Kind>(kind: K, applier: AppImportItemApplier<K>): AppImportStep {
  return { kind, apply: async (items, context, deps) => await applier(itemsOfKind(items, kind), context, deps) };
}

/** Workspaces first so scripts, presets and threads can find them; shortcuts and secrets last. */
const STEPS: readonly AppImportStep[] = [
  step("workspace", applyWorkspaces),
  step("setupScript", applySetupScripts),
  step("terminalPreset", applyTerminalPresets),
  step("thread", applyThreads),
  step("setting", applySettings),
  step("keybinding", applyKeybindings),
  step("envVar", applyEnvVars),
  step("bot", applyBots)
];

export interface AppImportApplyOutput {
  items: AppImportItemResult[];
  renderer: AppImportRendererChanges;
}

export interface AppImportPlanSelection {
  plan: AppImportPlan;
  selectedKeys: ReadonlySet<AppImportKey>;
}

interface PreparedPlan {
  plan: AppImportPlan;
  chosen: AppImportPlanItem[];
  runnable: AppImportPlanItem[];
  outcomes: Map<AppImportKey, AppImportItemOutcome>;
}

/** Splits the ticked items into those to run and those already settled (imported earlier, or unsupported). */
function preparePlan({ plan, selectedKeys }: AppImportPlanSelection, importedKeys: ReadonlySet<AppImportKey>): PreparedPlan {
  const chosen = listAppImportPlanItems(plan, importedKeys).filter((item) => selectedKeys.has(item.importKey));
  const outcomes = new Map<AppImportKey, AppImportItemOutcome>();
  const runnable: AppImportPlanItem[] = [];
  for (const item of chosen) {
    if (importedKeys.has(item.importKey)) outcomes.set(item.importKey, { status: "alreadyImported" });
    else if (item.support.status === "unsupported") outcomes.set(item.importKey, skipped(item.support.reason));
    else runnable.push(item);
  }
  return { plan, chosen, runnable, outcomes };
}

async function runPlan(prepared: PreparedPlan, importedKeys: ReadonlySet<AppImportKey>, report: (label: string) => void, renderer: AppImportRendererChanges, deps: AppImportApplyDeps): Promise<AppImportItemResult[]> {
  const { plan, chosen, runnable, outcomes } = prepared;
  const context: AppImportApplyContext = {
    plan,
    workspaces: new Map(plan.workspaces.map((workspace) => [workspace.importKey, workspace])),
    projects: new Map(),
    importedKeys,
    report
  };
  // Every step runs, even with nothing ticked: the workspace step links plan workspaces already in Nora for later steps.
  for (const { kind, apply } of STEPS) {
    const stepItems = runnable.filter((item) => item.kind === kind);
    try {
      const result = await apply(stepItems, context, deps);
      for (const [key, outcome] of result.outcomes) outcomes.set(key, outcome);
      if (result.renderer?.themeMode) renderer.themeMode = result.renderer.themeMode;
      if (result.renderer?.pinnedConversationIds) renderer.pinnedConversationIds.push(...result.renderer.pinnedConversationIds);
    } catch (error) {
      for (const item of stepItems) if (!outcomes.has(item.importKey)) outcomes.set(item.importKey, failed(error, "This item couldn't be imported."));
    }
  }
  return chosen.map((item): AppImportItemResult => ({ source: plan.source.id, importKey: item.importKey, kind: item.kind, label: item.label,
    outcome: outcomes.get(item.importKey) ?? failed(null, "This item couldn't be imported.") }));
}

/**
 * Applies the ticked items of freshly read plans, one app after another. Every item gets its own outcome: one
 * failing never stops the rest, items an earlier run brought in are not repeated, and only successes are written
 * to the ledger. Opening a project makes it active, so the project open before the import is reopened at the end.
 */
export async function applyAppImportPlans(selections: readonly AppImportPlanSelection[], deps: AppImportApplyDeps): Promise<AppImportApplyOutput> {
  const importedKeys = await deps.ledger.importedKeys();
  const prepared = selections.map((selection) => preparePlan(selection, importedKeys));
  const total = prepared.reduce((sum, plan) => sum + plan.runnable.length, 0);
  let started = 0;
  const report = (label: string) => {
    started = Math.min(started + 1, total);
    deps.onProgress?.({ completed: started - 1, total, label });
  };
  const activePath = deps.projects.activePath();
  const renderer: AppImportRendererChanges = { themeMode: null, pinnedConversationIds: [] };
  const items: AppImportItemResult[] = [];
  for (const plan of prepared) items.push(...await runPlan(plan, importedKeys, report, renderer, deps));
  if (activePath && deps.projects.activePath() !== activePath) await deps.projects.open(activePath).catch(() => undefined);
  deps.onProgress?.({ completed: total, total, label: "Done" });
  await deps.ledger.record(items.flatMap((item) => item.outcome.status === "applied" ? [item.importKey] : []));
  return { items, renderer };
}

import { appImportBotAvatar } from "@shared/app-import/botAvatar";
import { listAppImportPlanItems } from "@shared/app-import/planItems";
import { APP_IMPORT_BOT_SOURCE_IDS, appImportSourceDisplayName } from "@shared/app-import/sources";
import type { AppImportItemKind, AppImportItemResult, AppImportSourcePreview, AppImportSourceSelection } from "@shared/types/app-import/appImportApply.types";
import type { AppImportPlanItem } from "@shared/types/app-import/appImportItem.types";
import type { AppImportKey, AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportSourceId } from "@shared/types/app-import/appImportSource.types";
import { APP_IMPORT_BOT_EXPORT_GUIDES } from "@/components/app/constants/appImportBotExportGuides";
import type { AppImportBotExportEntry, AppImportBotExportGuide, AppImportBotTab, AppImportBotTabId, AppImportChecklist, AppImportFlowScope, AppImportOutcomeCounts, AppImportRow, AppImportRowGroup, AppImportSelectionTarget, AppImportSourceSummary } from "@/components/app/types/appImport.types";
import { APP_IMPORT_GROUP_ORDER, appImportCountLabel, appImportGroupTitle, appImportItemBadge, appImportItemDetail } from "./appImportItems";

interface ChecklistSource {
  id: string;
  preview: AppImportSourcePreview;
  target: AppImportSelectionTarget | null;
}

function inScope(kind: AppImportItemKind, scope: AppImportFlowScope): boolean {
  return scope === "bots" ? kind === "bot" : kind !== "bot";
}

function skippedInScope(item: AppImportSkippedItem, scope: AppImportFlowScope): boolean {
  return scope === "bots" ? item.kind === "bot" : item.kind !== "bot";
}

function sourceSummary({ id, preview }: ChecklistSource, items: readonly AppImportPlanItem[]): AppImportSourceSummary {
  const base = { id, source: preview.source, name: preview.status === "ready" ? preview.plan.source.displayName : appImportSourceDisplayName(preview.source) };
  switch (preview.status) {
    case "ready": {
      const counts = APP_IMPORT_GROUP_ORDER.flatMap((kind) => {
        const count = items.filter((item) => item.kind === kind).length;
        return count ? [appImportCountLabel(kind, count)] : [];
      });
      return { ...base, found: true, description: counts.length ? counts.join(", ") : "Nothing to import" };
    }
    case "notFound": return { ...base, found: false, description: "Not found on this computer" };
    case "unsupported": return { ...base, found: false, description: preview.reason };
    case "unreadable": return { ...base, found: false, description: `Couldn't be read: ${preview.reason}` };
  }
}

function itemRow(item: AppImportPlanItem, source: AppImportSourceId, importedKeys: ReadonlySet<AppImportKey>): AppImportRow {
  const selectable = item.support.status === "supported" && !importedKeys.has(item.importKey);
  return { id: item.importKey, kind: item.kind, label: item.label, detail: appImportItemDetail(item), sources: [source], keys: selectable ? [item.importKey] : [],
    badge: appImportItemBadge(item, importedKeys), avatar: item.kind === "bot" ? appImportBotAvatar(item.item) : null,
    unsupportedReason: item.support.status === "unsupported" ? item.support.reason : null, sensitive: item.kind === "envVar" };
}

/** A folder several apps know about becomes one row with every app's key. */
function mergeRow(existing: AppImportRow, next: AppImportRow): AppImportRow {
  return { ...existing, sources: [...existing.sources, ...next.sources], keys: [...existing.keys, ...next.keys], badge: existing.badge ?? next.badge };
}

function checklistSources(previews: readonly AppImportSourcePreview[], botExports: readonly AppImportBotExportEntry[]): ChecklistSource[] {
  return [
    ...previews.map((preview): ChecklistSource => ({ id: preview.source, preview, target: preview.source === "bot-export" ? null : { source: preview.source } })),
    ...botExports.map((entry, index): ChecklistSource => ({ id: `bot-export:${index}`, preview: entry.preview, target: { source: "bot-export", document: entry.document } }))
  ];
}

/**
 * Builds one checklist from every app's preview (and any pasted bot exports), limited to the scope: onboarding
 * keeps bots in their own step, so "work" leaves bots out and "bots" shows nothing else.
 */
export function buildAppImportChecklist(previews: readonly AppImportSourcePreview[], botExports: readonly AppImportBotExportEntry[], scope: AppImportFlowScope): AppImportChecklist {
  const sources: AppImportSourceSummary[] = [];
  const rows = new Map<string, AppImportRow>();
  const keyTargets = new Map<AppImportKey, AppImportSelectionTarget>();
  const defaultSelection = new Set<AppImportKey>();
  const leftBehind: AppImportChecklist["leftBehind"] = [];
  const warnings: string[] = [];
  for (const entry of checklistSources(previews, botExports)) {
    const { preview, target } = entry;
    if (preview.status !== "ready" || !target) {
      sources.push(sourceSummary(entry, []));
      continue;
    }
    const importedKeys = new Set(preview.importedKeys);
    const items = listAppImportPlanItems(preview.plan, importedKeys).filter((item) => inScope(item.kind, scope));
    sources.push(sourceSummary(entry, items));
    for (const item of items) {
      keyTargets.set(item.importKey, target);
      if (item.selectedByDefault) defaultSelection.add(item.importKey);
      const row = itemRow(item, preview.source, importedKeys);
      const id = item.kind === "workspace" ? `workspace:${item.item.path}` : row.id;
      const existing = rows.get(id);
      rows.set(id, existing ? mergeRow(existing, row) : { ...row, id });
    }
    leftBehind.push(...preview.plan.skipped.filter((item) => skippedInScope(item, scope)).map((item) => ({ source: preview.source, label: item.label, reason: item.reason })));
    warnings.push(...preview.plan.warnings);
  }
  const groups = APP_IMPORT_GROUP_ORDER.flatMap((kind): AppImportRowGroup[] => {
    const groupRows = [...rows.values()].filter((row) => row.kind === kind);
    return groupRows.length ? [{ kind, title: appImportGroupTitle(kind), rows: groupRows }] : [];
  });
  return { sources, groups, keyTargets, defaultSelection, leftBehind, warnings, hasSensitive: [...rows.values()].some((row) => row.sensitive) };
}

export function isAppImportRowChecked(row: AppImportRow, selected: ReadonlySet<AppImportKey>): boolean {
  return row.keys.length > 0 && row.keys.every((key) => selected.has(key));
}

export function toggledRowSelection(selected: ReadonlySet<AppImportKey>, row: AppImportRow): Set<AppImportKey> {
  const next = new Set(selected);
  const checked = isAppImportRowChecked(row, selected);
  for (const key of row.keys) {
    if (checked) next.delete(key);
    else next.add(key);
  }
  return next;
}

/** Selecting a whole group never ticks sensitive rows; those stay one at a time. */
export function groupSelection(selected: ReadonlySet<AppImportKey>, group: AppImportRowGroup, on: boolean): Set<AppImportKey> {
  const next = new Set(selected);
  for (const row of group.rows) {
    if (on && row.sensitive) continue;
    for (const key of row.keys) {
      if (on) next.add(key);
      else next.delete(key);
    }
  }
  return next;
}

function botExportGuide(tab: AppImportBotTabId): AppImportBotExportGuide | null {
  return tab === "orca" ? null : APP_IMPORT_BOT_EXPORT_GUIDES[tab];
}

/** Says when an app found on disk keeps its bots somewhere else, so the user knows to export them. */
function botTabNotice(preview: AppImportSourcePreview | undefined): string | null {
  if (preview?.status !== "ready") return null;
  const { format } = preview.plan.source;
  if (format.source !== "openbot" || !format.remoteServer) return null;
  return `OpenBot on this computer is connected to the server "${format.remoteServer}", which keeps its bots, so they aren't listed here. Export them below.`;
}

function botTab(id: AppImportBotTabId, label: string, previews: readonly AppImportSourcePreview[], botExports: readonly AppImportBotExportEntry[]): AppImportBotTab {
  const own = botExports.filter((entry) => entry.tab === id);
  return { id, label, checklist: buildAppImportChecklist(previews, own, "bots"), notice: botTabNotice(previews[0]), exportGuide: botExportGuide(id) };
}

/**
 * The bots step's tabs: one per app with bots on disk, plus Grok Bot, whose bots arrive as pasted exports. OpenBot
 * takes exports too, for bots kept on a server; each export is listed on the tab it was pasted into.
 */
export function appImportBotTabs(previews: readonly AppImportSourcePreview[], botExports: readonly AppImportBotExportEntry[]): AppImportBotTab[] {
  const sourceTabs = APP_IMPORT_BOT_SOURCE_IDS.map((source) =>
    botTab(source, appImportSourceDisplayName(source), previews.filter((preview) => preview.source === source), botExports));
  return [...sourceTabs, botTab("grok-bot", "Grok Bot", [], botExports)];
}

/** Splits the ticked keys back into one selection per app (or per pasted export) for the apply request. */
export function appImportSelections(selected: ReadonlySet<AppImportKey>, keyTargets: ReadonlyMap<AppImportKey, AppImportSelectionTarget>): AppImportSourceSelection[] {
  const groups = new Map<string, { target: AppImportSelectionTarget; keys: AppImportKey[] }>();
  for (const key of selected) {
    const target = keyTargets.get(key);
    if (!target) continue;
    const id = target.source === "bot-export" ? `bot-export:${target.document}` : target.source;
    const group = groups.get(id) ?? { target, keys: [] };
    group.keys.push(key);
    groups.set(id, group);
  }
  return [...groups.values()].map(({ target, keys }): AppImportSourceSelection =>
    target.source === "bot-export" ? { source: "bot-export", document: target.document, selectedKeys: keys } : { source: target.source, selectedKeys: keys });
}

export function countAppImportOutcomes(results: readonly AppImportItemResult[]): AppImportOutcomeCounts {
  const counts: AppImportOutcomeCounts = { applied: 0, alreadyImported: 0, skipped: 0, failed: 0 };
  for (const { outcome } of results) counts[outcome.status] += 1;
  return counts;
}

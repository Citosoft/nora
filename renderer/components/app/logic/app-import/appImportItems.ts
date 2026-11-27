import type { AppImportItemKind } from "@shared/types/app-import/appImportApply.types";
import type { AppImportPlanItem } from "@shared/types/app-import/appImportItem.types";
import type { AppImportBot, AppImportKey } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportBadge } from "@/components/app/types/appImport.types";

export const APP_IMPORT_GROUP_ORDER: readonly AppImportItemKind[] = ["workspace", "thread", "setupScript", "terminalPreset", "setting", "keybinding", "envVar", "bot"];

const GROUP_TITLES: Readonly<Record<AppImportItemKind, string>> = {
  workspace: "Projects",
  thread: "Threads",
  setupScript: "Setup scripts",
  terminalPreset: "Terminal presets",
  setting: "Settings & appearance",
  keybinding: "Keyboard shortcuts",
  envVar: "Environment variables",
  bot: "Bots"
};

const NOUNS: Readonly<Record<AppImportItemKind, [string, string]>> = {
  workspace: ["project", "projects"],
  thread: ["thread", "threads"],
  setupScript: ["setup script", "setup scripts"],
  terminalPreset: ["preset", "presets"],
  setting: ["setting", "settings"],
  keybinding: ["shortcut", "shortcuts"],
  envVar: ["environment variable", "environment variables"],
  bot: ["bot", "bots"]
};

export function appImportGroupTitle(kind: AppImportItemKind): string {
  return GROUP_TITLES[kind];
}

export function appImportCountLabel(kind: AppImportItemKind, count: number): string {
  const [one, many] = NOUNS[kind];
  return `${count} ${count === 1 ? one : many}`;
}

/** Second line under an item: where it lives or what it runs. */
export function appImportItemDetail(item: AppImportPlanItem): string | null {
  switch (item.kind) {
    case "workspace": return item.item.path;
    case "thread": return item.item.resumable ? "Continues the original Claude/Codex session." : item.item.transcript?.completeness === "partial" ? "Read-only: the app kept only some of its messages." : "Read-only: its session is gone, so the saved messages are imported.";
    case "setupScript": return `${item.item.phase === "setup" ? "When a worktree is created" : "Before a worktree is removed"}: ${item.item.command}`;
    case "terminalPreset": return item.item.action === "command" ? item.item.command : null;
    case "setting": return null;
    case "keybinding": return `${item.item.sourceCommand}${item.item.sourceChord ? ` (${item.item.sourceChord})` : " (unbound)"}`;
    case "envVar": return "May contain a key or token. Saved to Nora's secrets only if you tick it.";
    case "bot": return botDetail(item.item);
  }
}

function botDetail(bot: AppImportBot): string {
  const parts = [bot.role || null,
    bot.memory.length ? `${bot.memory.length} memory ${bot.memory.length === 1 ? "note" : "notes"}` : null,
    bot.routines.length ? `${bot.routines.length} ${bot.routines.length === 1 ? "routine" : "routines"} (arrive paused)` : null,
    ...bot.adjustments];
  return parts.filter((part): part is string => !!part).join(" · ") || "No instructions or memory to bring";
}

/** Short badge for an item's state, if it needs one. */
export function appImportItemBadge(item: AppImportPlanItem, importedKeys: ReadonlySet<AppImportKey>): AppImportBadge | null {
  if (importedKeys.has(item.importKey)) return { label: item.kind === "workspace" ? "Already in Nora" : "Imported", variant: "secondary" };
  if (item.support.status === "unsupported") return { label: "Not supported", variant: "outline" };
  if (item.kind === "thread") return item.item.resumable ? { label: "Resumable", variant: "success" } : { label: "Read-only", variant: "secondary" };
  if (item.kind === "envVar") return { label: "Sensitive", variant: "warning" };
  return null;
}

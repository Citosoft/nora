import { formatKeybindingLabel } from "@/components/app/logic/keybindings/keybindingMatching";
import type { KeybindingHelpRow, KeybindingSet } from "@/components/app/types/keybindings.types";
import { RECENT_WORKSPACE_KEYBINDING_COMMAND_IDS } from "@shared/keybindings/commandIds";
import { KEYBINDING_COMMANDS } from "@shared/keybindings/commands";
import type { KeybindingCategory, KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";

const RECENT_WORKSPACE_COMMAND_IDS: readonly KeybindingCommandId[] = RECENT_WORKSPACE_KEYBINDING_COMMAND_IDS;

/** Collapses the five recent-workspace commands into one row (first … last) while they are all bound. */
function recentWorkspacesRow(set: KeybindingSet): KeybindingHelpRow | null {
  const labels = RECENT_WORKSPACE_COMMAND_IDS.map((id) => formatKeybindingLabel(set.byId.get(id), set.platform));
  const first = labels[0];
  const last = labels[labels.length - 1];
  if (labels.some((label) => label === null) || !first || !last) return null;
  return {
    key: "open-recent-workspace",
    title: "Open Recent Workspace",
    description: "Open one of the first five workspaces in your recent list, by position.",
    label: `${first} … ${last}`
  };
}

/** Bound commands grouped by category, for the keyboard shortcuts help dialog. */
export function buildKeybindingHelpGroups(set: KeybindingSet): { category: KeybindingCategory; rows: KeybindingHelpRow[] }[] {
  const recentRow = recentWorkspacesRow(set);
  const groups = new Map<KeybindingCategory, KeybindingHelpRow[]>();
  for (const command of KEYBINDING_COMMANDS) {
    const isRecent = RECENT_WORKSPACE_COMMAND_IDS.includes(command.id);
    if (isRecent && recentRow && command.id !== RECENT_WORKSPACE_COMMAND_IDS[0]) continue;
    const row = isRecent && recentRow
      ? recentRow
      : { key: command.id, title: command.title, description: command.description, label: formatKeybindingLabel(set.byId.get(command.id), set.platform) };
    if (!row.label) continue;
    groups.set(command.category, [...(groups.get(command.category) ?? []), row]);
  }
  return [...groups].map(([category, rows]) => ({ category, rows }));
}

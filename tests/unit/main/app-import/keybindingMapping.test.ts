import assert from "node:assert/strict";
import test from "node:test";
import { mapAppImportKeybindings } from "@main/app-import/keybindingMapping";
import { orcaKeybindingMapping } from "@main/app-import/sources/orca/keybindingMapping";
import { t3CodeKeybindingMapping } from "@main/app-import/sources/t3-code/keybindingMapping";
import { isKeybindingCommandId } from "@shared/keybindings/commands";
import type { AppImportSourceKeybinding } from "@main/types/app-import/appImportSource.types";

function binding(sourceCommand: string, chord: string | null): AppImportSourceKeybinding {
  return { importKey: `k:${sourceCommand}:${chord}`, sourceCommand, chord };
}

test("keybinding mappings only target real Nora commands", () => {
  for (const mapping of [t3CodeKeybindingMapping, orcaKeybindingMapping]) {
    for (const commandId of Object.values(mapping.commands)) assert.ok(isKeybindingCommandId(commandId), `${mapping.sourceName} maps to unknown ${commandId}`);
  }
});

test("T3 Code: defaults are dropped, customisations convert to accelerators, the rest is reported", () => {
  const result = mapAppImportKeybindings([
    binding("sidebar.toggle", "mod+b"),
    binding("chat.new", "mod+shift+o"),
    binding("terminal.toggle", "mod+shift+j"),
    binding("thread.previous", "alt+arrowup"),
    binding("thread.next", "mod+shift+]"),
    binding("usage.open", "mod+u"),
    binding("usage.cost", "mod+shift+u"),
    binding("composer.stash", "mod++"),
    binding("terminal.new", null)
  ], t3CodeKeybindingMapping);
  assert.deepEqual(result.keybindings.map(({ commandId, accelerator }) => `${commandId}=${accelerator}`), [
    "toggle-local-terminal-dock=CmdOrCtrl+Shift+J",
    "focus-previous-session-tab=Alt+Up",
    "open-create-terminal=null"
  ]);
  // usage.open=mod+u is a T3 Code default, so it is neither imported nor reported.
  assert.deepEqual(result.skipped.map((item) => item.label), ["usage.cost (mod+shift+u)", "composer.stash (mod++)"]);
});

test("Orca: every stored binding is a user override; one chord per Nora command", () => {
  const result = mapAppImportKeybindings([binding("app.settings", "Mod+Comma"), binding("tab.close", null), binding("worktree.palette", "Mod+K"), binding("worktree.palette", "Mod+P")], orcaKeybindingMapping);
  assert.deepEqual(result.keybindings.map(({ commandId, accelerator }) => `${commandId}=${accelerator}`), ["open-settings=CmdOrCtrl+,", "close-active-session-tab=null", "open-workspace-quick-search=CmdOrCtrl+K"]);
  assert.equal(result.skipped[0]?.reason, "Nora keeps one shortcut per command; the first one was imported.");
});

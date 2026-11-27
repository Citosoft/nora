import { KEYBINDING_COMMAND_IDS } from "@shared/keybindings/commandIds";
import { KEYBINDING_COMMANDS } from "@shared/keybindings/commands";
import { parseKeyChord } from "@shared/keybindings/chord";
import { detectKeybindingConflicts, EMPTY_KEYBINDINGS_FILE, KEYBINDING_PLATFORMS, resolveKeybindings } from "@shared/keybindings/resolve";
import type { KeybindingsFile, ResolvedKeybinding } from "@shared/types/keybindings/keybindings.types";
import assert from "node:assert/strict";
import test from "node:test";

function binding(bindings: ResolvedKeybinding[], commandId: ResolvedKeybinding["commandId"]): ResolvedKeybinding {
  const found = bindings.find((entry) => entry.commandId === commandId);
  assert.ok(found, `Expected ${commandId} to resolve`);
  return found;
}

test("every registered command has a unique id and a parseable default", () => {
  assert.equal(new Set(KEYBINDING_COMMAND_IDS).size, KEYBINDING_COMMAND_IDS.length);
  assert.deepEqual(KEYBINDING_COMMANDS.map((command) => command.id), [...KEYBINDING_COMMAND_IDS]);
  for (const command of KEYBINDING_COMMANDS) {
    if (command.defaultAccelerator !== null) assert.ok(parseKeyChord(command.defaultAccelerator).ok, command.id);
  }
});

test("the default bindings do not conflict on any platform", () => {
  for (const platform of KEYBINDING_PLATFORMS) {
    assert.deepEqual(detectKeybindingConflicts(resolveKeybindings(EMPTY_KEYBINDINGS_FILE, platform), platform), [], platform);
  }
});

test("defaults resolve per platform", () => {
  const mac = binding(resolveKeybindings(EMPTY_KEYBINDINGS_FILE, "darwin"), "open-workspace-quick-search");
  assert.equal(mac.accelerator, "CmdOrCtrl+K");
  assert.equal(mac.source, "default");
  assert.deepEqual(mac.chord, { meta: true, ctrl: false, alt: false, shift: false, key: "K" });
  const windows = binding(resolveKeybindings(EMPTY_KEYBINDINGS_FILE, "win32"), "open-workspace-quick-search");
  assert.deepEqual(windows.chord, { meta: false, ctrl: true, alt: false, shift: false, key: "K" });
});

test("platform overrides beat shared overrides, which beat defaults, and null unbinds", () => {
  const file: KeybindingsFile = {
    version: 1,
    overrides: { "toggle-workspace-sidebar": "CmdOrCtrl+Alt+B", "open-settings": null },
    platformOverrides: { darwin: { "toggle-workspace-sidebar": "Meta+Shift+E" } }
  };
  const mac = resolveKeybindings(file, "darwin");
  assert.equal(binding(mac, "toggle-workspace-sidebar").accelerator, "Meta+Shift+E");
  assert.equal(binding(mac, "toggle-workspace-sidebar").source, "user-platform");
  const linux = resolveKeybindings(file, "linux");
  assert.equal(binding(linux, "toggle-workspace-sidebar").accelerator, "CmdOrCtrl+Alt+B");
  assert.equal(binding(linux, "toggle-workspace-sidebar").source, "user");
  assert.equal(binding(linux, "toggle-workspace-sidebar").defaultAccelerator, "CmdOrCtrl+B");
  const settings = binding(linux, "open-settings");
  assert.equal(settings.accelerator, null);
  assert.equal(settings.chord, null);
});

test("conflicts need the same concrete chord in overlapping scopes", () => {
  // Cmd+K on macOS is both CmdOrCtrl+K and Meta+K.
  const clash: KeybindingsFile = { version: 1, overrides: { "toggle-workspace-sidebar": "Meta+K" }, platformOverrides: {} };
  assert.deepEqual(detectKeybindingConflicts(resolveKeybindings(clash, "darwin"), "darwin"), [
    { platform: "darwin", accelerator: "CmdOrCtrl+K", commandIds: ["open-workspace-quick-search", "toggle-workspace-sidebar"] }
  ]);
  // On Windows Meta+K is the Windows key, so the two no longer clash.
  assert.deepEqual(detectKeybindingConflicts(resolveKeybindings(clash, "win32"), "win32"), []);

  // Save (editor) and Stash Prompt (composer) share CmdOrCtrl+S by design: different surfaces.
  const surfaces = resolveKeybindings(EMPTY_KEYBINDINGS_FILE, "darwin");
  assert.equal(binding(surfaces, "save-document").accelerator, binding(surfaces, "stash-composer-prompt").accelerator);

  // A workbench command clashes with every surface.
  const workbench: KeybindingsFile = { version: 1, overrides: { "open-settings": "CmdOrCtrl+S" }, platformOverrides: {} };
  const conflicts = detectKeybindingConflicts(resolveKeybindings(workbench, "linux"), "linux");
  assert.equal(conflicts.length, 1);
  assert.deepEqual([...(conflicts[0]?.commandIds ?? [])].sort(), ["open-settings", "save-document", "stash-composer-prompt"]);
});

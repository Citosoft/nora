import { applyKeybindingUpdate, normalizeKeybindingsFile, planKeybindingOverrides } from "@shared/keybindings/overrides";
import { EMPTY_KEYBINDINGS_FILE } from "@shared/keybindings/resolve";
import { parseKeybindingUpdateRequest } from "@shared/keybindings/updateRequest";
import type { KeybindingsFile } from "@shared/types/keybindings/keybindings.types";
import assert from "node:assert/strict";
import test from "node:test";

test("normalisation keeps valid overrides and drops everything else", () => {
  const file = normalizeKeybindingsFile({
    version: 1,
    overrides: {
      "toggle-workspace-sidebar": "shift+cmdorctrl+e",
      "open-settings": null,
      "not-a-command": "CmdOrCtrl+P",
      "open-add-workspace": "CmdOrCtrl+Banana",
      "open-create-agent": 42
    },
    platformOverrides: { darwin: { "open-create-terminal": "Meta+T" }, linux: { bogus: "F1" }, beos: { "open-settings": "F2" } }
  });
  assert.deepEqual(file, {
    version: 1,
    overrides: { "toggle-workspace-sidebar": "CmdOrCtrl+Shift+E", "open-settings": null },
    platformOverrides: { darwin: { "open-create-terminal": "Meta+T" } }
  });
});

test("normalisation tolerates garbage", () => {
  for (const input of [null, "text", 3, [], { overrides: "x", platformOverrides: [] }]) {
    assert.deepEqual(normalizeKeybindingsFile(input), EMPTY_KEYBINDINGS_FILE);
  }
});

test("settings edits write shared overrides, clear the platform override, and drop default-equal chords", () => {
  const file: KeybindingsFile = {
    version: 1,
    overrides: { "open-settings": null },
    platformOverrides: { darwin: { "toggle-workspace-sidebar": "Meta+E" } }
  };
  const edited = applyKeybindingUpdate(file, { kind: "set", commandId: "toggle-workspace-sidebar", accelerator: "cmdorctrl+alt+b" }, "darwin");
  assert.deepEqual(edited, { version: 1, overrides: { "open-settings": null, "toggle-workspace-sidebar": "CmdOrCtrl+Alt+B" }, platformOverrides: {} });

  const backToDefault = applyKeybindingUpdate(edited, { kind: "set", commandId: "toggle-workspace-sidebar", accelerator: "CmdOrCtrl+B" }, "darwin");
  assert.deepEqual(backToDefault.overrides, { "open-settings": null });

  const reset = applyKeybindingUpdate(edited, { kind: "reset", commandId: "open-settings" }, "darwin");
  assert.deepEqual(reset.overrides, { "toggle-workspace-sidebar": "CmdOrCtrl+Alt+B" });

  assert.deepEqual(applyKeybindingUpdate(edited, { kind: "reset-all" }, "darwin"), EMPTY_KEYBINDINGS_FILE);
  assert.throws(() => applyKeybindingUpdate(file, { kind: "set", commandId: "open-settings", accelerator: "Banana" }, "darwin"));
});

test("importer overrides report unknown ids, invalid chords and conflicts, skipping clashes by default", () => {
  const { file, result } = planKeybindingOverrides(EMPTY_KEYBINDINGS_FILE, {
    "toggle-workspace-sidebar": "CmdOrCtrl+Alt+B",
    "open-settings": null,
    "workbench.action.quickOpen": "CmdOrCtrl+P",
    "open-create-agent": "CmdOrCtrl+Pickle",
    "open-add-workspace": "CmdOrCtrl+K"
  });
  assert.deepEqual(result.applied, [
    { commandId: "toggle-workspace-sidebar", accelerator: "CmdOrCtrl+Alt+B" },
    { commandId: "open-settings", accelerator: null }
  ]);
  assert.deepEqual(result.unknown, ["workbench.action.quickOpen"]);
  assert.equal(result.invalid.length, 1);
  assert.equal(result.invalid[0]?.commandId, "open-create-agent");
  assert.deepEqual(result.conflicts, [
    { commandId: "open-add-workspace", accelerator: "CmdOrCtrl+K", conflictsWith: ["open-workspace-quick-search"], platforms: ["darwin", "win32", "linux"] }
  ]);
  assert.deepEqual(result.displaced, []);
  assert.deepEqual(file.overrides, { "toggle-workspace-sidebar": "CmdOrCtrl+Alt+B", "open-settings": null });
});

test("replace mode applies clashing overrides and unbinds the commands they displace", () => {
  const { file, result } = planKeybindingOverrides(EMPTY_KEYBINDINGS_FILE, { "open-add-workspace": "CmdOrCtrl+K" }, { onConflict: "replace" });
  assert.deepEqual(result.applied, [{ commandId: "open-add-workspace", accelerator: "CmdOrCtrl+K" }]);
  assert.deepEqual(result.displaced, ["open-workspace-quick-search"]);
  assert.deepEqual(file.overrides, { "open-add-workspace": "CmdOrCtrl+K", "open-workspace-quick-search": null });
});

test("platform-scoped overrides only check and write that platform", () => {
  // Meta+K only collides with CmdOrCtrl+K on macOS.
  const windows = planKeybindingOverrides(EMPTY_KEYBINDINGS_FILE, { "open-add-workspace": "Meta+K" }, { platform: "win32" });
  assert.deepEqual(windows.result.conflicts, []);
  assert.deepEqual(windows.file.platformOverrides, { win32: { "open-add-workspace": "Meta+K" } });
  assert.deepEqual(windows.file.overrides, {});

  const mac = planKeybindingOverrides(EMPTY_KEYBINDINGS_FILE, { "open-add-workspace": "Meta+K" }, { platform: "darwin" });
  assert.equal(mac.result.conflicts.length, 1);
  assert.deepEqual(mac.result.conflicts[0]?.platforms, ["darwin"]);
});

test("update requests from IPC are narrowed", () => {
  assert.deepEqual(parseKeybindingUpdateRequest({ kind: "reset-all" }), { kind: "reset-all" });
  assert.deepEqual(parseKeybindingUpdateRequest({ kind: "set", commandId: "open-settings", accelerator: null }),
    { kind: "set", commandId: "open-settings", accelerator: null });
  assert.equal(parseKeybindingUpdateRequest({ kind: "set", commandId: "nope", accelerator: "F1" }), null);
  assert.equal(parseKeybindingUpdateRequest({ kind: "set", commandId: "open-settings" }), null);
  assert.equal(parseKeybindingUpdateRequest("reset-all"), null);
});

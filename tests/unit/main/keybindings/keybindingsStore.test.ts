import { createKeybindingsService } from "@main/keybindings/keybindingsService";
import { createKeybindingsFileStore } from "@main/keybindings/keybindingsStore";
import { EMPTY_KEYBINDINGS_FILE } from "@shared/keybindings/resolve";
import type { KeybindingsFile } from "@shared/types/keybindings/keybindings.types";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "nora-keybindings-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const ids = () => {
  let next = 0;
  return () => `id-${++next}`;
};

test("a missing file loads as no overrides", async () => {
  await withTempDir(async (dir) => {
    const store = createKeybindingsFileStore({ path: path.join(dir, "config", "keybindings.json"), nextId: ids() });
    assert.deepEqual(await store.load(), EMPTY_KEYBINDINGS_FILE);
  });
});

test("an unparsable file loads as defaults and is reported, not overwritten", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir, "keybindings.json");
    await writeFile(filePath, "{ not json");
    const errors: unknown[] = [];
    const store = createKeybindingsFileStore({ path: filePath, nextId: ids(), onReadError: (error) => errors.push(error) });
    assert.deepEqual(await store.load(), EMPTY_KEYBINDINGS_FILE);
    assert.equal(errors.length, 1);
    assert.equal(await readFile(filePath, "utf8"), "{ not json");
  });
});

test("saves are atomic, normalised and round-trip", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir, "config", "keybindings.json");
    const store = createKeybindingsFileStore({ path: filePath, nextId: ids() });
    const file: KeybindingsFile = { version: 1, overrides: { "open-settings": "shift+cmdorctrl+p" }, platformOverrides: {} };
    await store.save(file);
    assert.deepEqual(await readdir(path.dirname(filePath)), ["keybindings.json"]);
    assert.deepEqual(JSON.parse(await readFile(filePath, "utf8")), {
      version: 1,
      overrides: { "open-settings": "CmdOrCtrl+Shift+P" },
      platformOverrides: {}
    });
    assert.deepEqual(await store.load(), { version: 1, overrides: { "open-settings": "CmdOrCtrl+Shift+P" }, platformOverrides: {} });
  });
});

test("the service persists edits and importer overrides and notifies subscribers", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir, "keybindings.json");
    const service = createKeybindingsService({ platform: "darwin", store: createKeybindingsFileStore({ path: filePath, nextId: ids() }) });
    await service.load();
    const seen: KeybindingsFile[] = [];
    service.subscribe((file) => seen.push(file));

    await service.update({ kind: "set", commandId: "open-settings", accelerator: "CmdOrCtrl+;" });
    assert.equal(service.resolved().find((binding) => binding.commandId === "open-settings")?.accelerator, "CmdOrCtrl+;");

    const result = await service.applyKeybindingOverrides({ "open-create-agent": "CmdOrCtrl+Shift+N", unknown: "F1" });
    assert.deepEqual(result.applied, [{ commandId: "open-create-agent", accelerator: "CmdOrCtrl+Shift+N" }]);
    assert.deepEqual(result.unknown, ["unknown"]);

    // Nothing applied means nothing written or broadcast.
    await service.applyKeybindingOverrides({ "open-add-workspace": "CmdOrCtrl+K" });
    assert.equal(seen.length, 2);

    const reloaded = createKeybindingsFileStore({ path: filePath, nextId: ids() });
    assert.deepEqual((await reloaded.load()).overrides, { "open-settings": "CmdOrCtrl+;", "open-create-agent": "CmdOrCtrl+Shift+N" });
  });
});

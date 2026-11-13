import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { TestContext } from "node:test";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { applyBotRequest } from "@main/bots/botRequests";
import { createSharedBotLibrary } from "@main/bots/sharedBotLibrary";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { BotScope } from "@shared/types/bots/bots.types";
import { bot } from "../../shared/bots/fixtures";

function setup(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "nora-bots-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const workspace: NativeWorkspace = { id: "w", name: "W", kind: "folder", workspace: { environmentId: "local", projectId: "w", checkoutId: "c", path: directory, branch: "", access: "write" } };
  let settings = structuredClone(DEFAULT_APP_SETTINGS);
  const store = { read: () => settings, async update(change: (current: typeof settings) => typeof settings) { settings = change(settings); return settings; } };
  const library = createSharedBotLibrary();
  const deps = { workspaces: () => [workspace], library };
  return { directory, workspace, library, store, deps, get settings() { return settings; } };
}
const shared: BotScope = { kind: "workspace", workspaceId: "w", storage: "shared" };
const personal: BotScope = { kind: "workspace", workspaceId: "w", storage: "private" };

test("bots move between global, private and shared storage keeping their id and bumping revision", async (t) => {
  const s = setup(t);
  await applyBotRequest({ kind: "save-bot", bot: bot("ada", { kind: "global" }, { revision: 9 }), previousScope: null }, s.store, s.deps);
  assert.equal(s.settings.personalization.bots?.global[0].revision, 1);
  await assert.rejects(applyBotRequest({ kind: "save-bot", bot: bot("ada"), previousScope: null }, s.store, s.deps), /already exists/);
  await applyBotRequest({ kind: "save-bot", bot: bot("ada", shared), previousScope: { kind: "global" } }, s.store, s.deps);
  assert.deepEqual(s.settings.personalization.bots?.global, []);
  const file = join(s.directory, ".nora", "bots", "ada.md");
  assert.match(readFileSync(file, "utf8"), /revision: 2/);
  assert.deepEqual(s.library.list()[0].bots.map((entry) => [entry.id, entry.revision]), [["ada", 2]]);
  await applyBotRequest({ kind: "save-bot", bot: bot("ada", personal), previousScope: shared }, s.store, s.deps);
  assert.equal(existsSync(file), false);
  assert.equal(s.settings.personalization.bots?.workspaces.w.private[0].revision, 3);
  await applyBotRequest({ kind: "delete-bot", botId: "ada", scope: personal }, s.store, s.deps);
  assert.deepEqual(s.settings.personalization.bots?.workspaces, {});
  await assert.rejects(applyBotRequest({ kind: "save-bot", bot: bot("ada"), previousScope: personal }, s.store, s.deps), /changed or was removed/);
});

test("hiding needs a known workspace and shared files report problems without hiding valid bots", async (t) => {
  const s = setup(t);
  await assert.rejects(applyBotRequest({ kind: "set-bot-hidden", workspaceId: "missing", botId: "ada", hidden: true }, s.store, s.deps), /existing workspace/);
  await applyBotRequest({ kind: "set-bot-hidden", workspaceId: "w", botId: "ada", hidden: true }, s.store, s.deps);
  assert.deepEqual(s.settings.personalization.bots?.workspaces.w.hidden, ["ada"]);
  mkdirSync(join(s.directory, ".nora", "bots"), { recursive: true });
  writeFileSync(join(s.directory, ".nora", "bots", "good.md"), "---\nname: Good\nprovider: claude\nmodel: m\n---\n");
  writeFileSync(join(s.directory, ".nora", "bots", "bad.md"), "nope");
  writeFileSync(join(s.directory, ".nora", "bots", "notes.txt"), "ignored");
  await applyBotRequest({ kind: "refresh-bots" }, s.store, s.deps);
  const [set] = s.library.list();
  assert.deepEqual(set.bots.map((entry) => entry.id), ["good"]);
  assert.deepEqual(set.problems.map((problem) => problem.file), [".nora/bots/bad.md"]);
});

test("a symlinked bot directory is refused", async (t) => {
  const s = setup(t);
  const outside = mkdtempSync(join(tmpdir(), "nora-outside-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  mkdirSync(join(s.directory, ".nora"));
  symlinkSync(outside, join(s.directory, ".nora", "bots"));
  await s.library.refresh([s.workspace]);
  assert.match(s.library.list()[0].problems[0].message, /regular directory/);
  await assert.rejects(s.library.write(s.workspace, bot("ada", shared)), /regular directory/);
  assert.equal(existsSync(join(outside, "ada.md")), false);
});

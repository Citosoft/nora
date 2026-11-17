import assert from "node:assert/strict";
import test from "node:test";
import { parseSharedBotFile, serializeSharedBotFile, sharedBotFileName } from "@shared/bots/botFile";
import { bot } from "./fixtures";

const scope = { kind: "workspace", workspaceId: "w", storage: "shared" } as const;

test("shared bot files round-trip every field", () => {
  const original = bot("release-manager", scope, { binding: { kind: "codex", instanceId: "work", model: "gpt-6", reasoning: "high", permissionPolicy: "auto" },
    avatar: { seed: 42, shape: "cloud", palette: "teal", eyes: "oval" }, instructions: "Line one.\n\nLine two.", revision: 3 });
  const text = serializeSharedBotFile(original);
  assert.match(text, /^---\nname: Release Manager\n/);
  assert.deepEqual(parseSharedBotFile(sharedBotFileName(original.id), text, "w"), { ok: true, bot: original });
});

test("minimal files default the instance, seed and revision", () => {
  const parsed = parseSharedBotFile("pip.md", "---\nname: Pip\nprovider: claude\nmodel: claude-opus-5-5\n---\nHi", "w");
  assert.ok(parsed.ok);
  assert.equal(parsed.bot.binding.instanceId, "claude");
  assert.deepEqual(parsed.bot.avatar, { seed: 0 });
  assert.equal(parsed.bot.revision, 1);
  assert.equal(parsed.bot.role, "");
});

test("malformed files report a readable problem instead of throwing", () => {
  const cases: [string, string, RegExp][] = [
    ["Pip.md", "---\nname: Pip\n---", /lowercase/],
    ["pip.txt", "", /\.md/],
    ["pip.md", "name: Pip", /start with/],
    ["pip.md", "---\nname: Pip\n", /not closed/],
    ["pip.md", "---\nname: Pip\nname: Pop\n---", /more than once/],
    ["pip.md", "---\ncolour: red\n---", /Unknown field "colour"/],
    ["pip.md", "---\njust text\n---", /key: value/],
    ["pip.md", "---\nname: Pip\nprovider: claude\nmodel: m\nseed: -1\n---", /avatar\.seed/],
    ["pip.md", "---\nname: Pip\nprovider: nope\nmodel: m\n---", /binding\.kind/]
  ];
  for (const [name, text, message] of cases) {
    const parsed = parseSharedBotFile(name, text, "w");
    assert.equal(parsed.ok, false, name + text);
    if (!parsed.ok) assert.match(parsed.message, message);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { botEditorDraft, botFromEditorDraft, newBotEditorDraft, templateEditorDraft } from "@/components/app/logic/botEditor";
import { BOT_TEMPLATES } from "@shared/bots/templates";
import { bot } from "../shared/bots/fixtures";

const model = { kind: "claude" as const, instanceId: "claude", model: "claude-opus-5-5" };

test("new bots need a name and model and get a free slug id", () => {
  const draft = newBotEditorDraft({ kind: "global" }, null, 5);
  assert.deepEqual(botFromEditorDraft(draft, null, new Set()), { ok: false, message: "Give your bot a name." });
  assert.deepEqual(botFromEditorDraft({ ...draft, name: "Ada" }, null, new Set()), { ok: false, message: "Choose a provider and model for this bot." });
  const result = botFromEditorDraft({ ...draft, name: "Ada", model }, null, new Set(["ada"]));
  assert.ok(result.ok);
  assert.equal(result.bot.id, "ada-2");
  assert.deepEqual(result.bot.binding, { ...model, reasoning: null, permissionPolicy: null });
});

test("edits keep the id and carry reasoning and policy only while the provider is unchanged", () => {
  const existing = bot("ada", { kind: "global" }, { binding: { ...model, reasoning: "high", permissionPolicy: "auto" } });
  const same = botFromEditorDraft({ ...botEditorDraft(existing), name: "Ada Renamed", model: { ...model, model: "claude-sonnet-5-5" } }, existing, new Set(["ada"]));
  assert.ok(same.ok);
  assert.equal(same.bot.id, "ada");
  assert.equal(same.bot.binding.reasoning, "high");
  const moved = botFromEditorDraft({ ...botEditorDraft(existing), model: { kind: "codex", instanceId: "codex", model: "gpt-6" } }, existing, new Set());
  assert.ok(moved.ok);
  assert.deepEqual([moved.bot.binding.reasoning, moved.bot.binding.permissionPolicy], [null, null]);
  const tooLong = botFromEditorDraft({ ...botEditorDraft(existing), role: "r".repeat(81) }, existing, new Set());
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.match(tooLong.message, /^Role:/);
});

test("every template is a valid bot once a model is chosen, with distinct ids and faces", () => {
  assert.equal(new Set(BOT_TEMPLATES.map((template) => template.id)).size, BOT_TEMPLATES.length);
  assert.equal(new Set(BOT_TEMPLATES.map((template) => `${template.avatar.shape}/${template.avatar.palette}`)).size, BOT_TEMPLATES.length);
  for (const template of BOT_TEMPLATES) {
    const result = botFromEditorDraft(templateEditorDraft(template, { kind: "global" }, model, 3), null, new Set());
    assert.ok(result.ok, template.id);
    assert.deepEqual(result.ok && result.bot.avatar, { seed: 3, ...template.avatar });
  }
});

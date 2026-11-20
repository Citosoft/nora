import assert from "node:assert/strict";
import test from "node:test";
import { BOT_TEMPLATES } from "@shared/bots/templates";
import { ROUTINE_TEMPLATES } from "@shared/bots/routines/templates";
import { routineInputsForTemplate, routinesForTemplate } from "@shared/bots/templateRoutines";
import { ROUTINES_PER_BOT_MAX, routineInputSchema } from "@shared/bots/routines/contracts";
import { personalizationRequestSchema } from "@shared/personalization/gateway";
import { bot } from "./fixtures";

test("every bot template references valid, unique routine presets that create paused inputs", () => {
  const ids = new Set(ROUTINE_TEMPLATES.map((routine) => routine.id));
  assert.equal(ids.size, ROUTINE_TEMPLATES.length);
  for (const template of BOT_TEMPLATES) {
    assert.ok(template.routineTemplateIds.length > 0, template.id);
    assert.ok(template.routineTemplateIds.length <= ROUTINES_PER_BOT_MAX, template.id);
    assert.equal(new Set(template.routineTemplateIds).size, template.routineTemplateIds.length, template.id);
    assert.ok(template.routineTemplateIds.every((id) => ids.has(id)), template.id);
    const inputs = routineInputsForTemplate(template, template.routineTemplateIds, bot("ada"), "w", "Europe/London");
    assert.equal(inputs.length, template.routineTemplateIds.length);
    for (const input of inputs) {
      assert.ok(routineInputSchema.safeParse(input).success, template.id);
      assert.equal(input.active, false);
      assert.equal(input.missedPolicy, "skip");
      assert.equal(input.workspaceId, "w");
      assert.equal(input.timezone, "Europe/London");
      assert.equal(input.botId, "ada");
    }
  }
});

test("routine choices can be omitted and may not escape a template or the bot's workspace", () => {
  const template = BOT_TEMPLATES[0];
  assert.deepEqual(routineInputsForTemplate(template, [], bot("ada"), "w", "UTC"), []);
  const selected = routinesForTemplate(template)[0];
  assert.ok(selected);
  const [input] = routineInputsForTemplate(template, [selected.id], bot("ada"), "w", "UTC");
  assert.deepEqual(input.schedule, selected.schedule);
  assert.equal(input.instruction, selected.instruction);
  assert.throws(() => routineInputsForTemplate(template, ["not-included"], bot("ada"), "w", "UTC"), /included/);
  assert.throws(() => routineInputsForTemplate(template, [selected.id, selected.id], bot("ada"), "w", "UTC"), /included/);
  assert.throws(() => routineInputsForTemplate(template, [selected.id], bot("ada", { kind: "workspace", workspaceId: "w", storage: "private" }), "other", "UTC"), /own workspace/);
});

test("the create request accepts only paused initial routines", () => {
  const template = BOT_TEMPLATES[0];
  const input = routineInputsForTemplate(template, template.routineTemplateIds, bot("ada"), "w", "UTC");
  const request = { kind: "save-bot", bot: bot("ada"), previousScope: null, initialRoutines: input };
  assert.ok(personalizationRequestSchema.safeParse(request).success);
  assert.equal(personalizationRequestSchema.safeParse({ ...request, initialRoutines: input.map((routine) => ({ ...routine, active: true })) }).success, false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { BOT_TEMPLATES, templatesForRole } from "@shared/bots/templates";
import { presetRoleSchema } from "@shared/personalization/contracts";

test("every preset role gets at least two suggestions, and suggestions plus the rest list each template once", () => {
  for (const id of presetRoleSchema.options) {
    const { suggested, more } = templatesForRole({ id });
    assert.ok(suggested.length >= 2, id);
    assert.ok(suggested.every((template) => template.roles.includes(id)), id);
    assert.deepEqual([...suggested, ...more].map((template) => template.id).sort(), BOT_TEMPLATES.map((template) => template.id).sort());
  }
});

test("a custom role uses General's suggestions and no role suggests nothing", () => {
  assert.deepEqual(templatesForRole({ id: "custom", description: "Community organiser" }), templatesForRole({ id: "general" }));
  assert.deepEqual(templatesForRole(null), { suggested: [], more: BOT_TEMPLATES });
  assert.equal(templatesForRole({ id: "developer" }).suggested[0].id, "code-reviewer");
  assert.equal(templatesForRole({ id: "operations" }).suggested.some((template) => template.id === "process-documenter"), true);
});

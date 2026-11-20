import assert from "node:assert/strict";
import test from "node:test";
import { BOT_TEMPLATES, templatesForRole } from "@shared/bots/templates";
import { presetRoleSchema } from "@shared/personalization/contracts";

test("every preset role gets at least four suggestions, and suggestions plus the rest list each template once", () => {
  for (const id of presetRoleSchema.options) {
    const { suggested, more } = templatesForRole({ id });
    assert.ok(suggested.length >= 4, id);
    assert.ok(suggested.every((template) => template.roles.includes(id)), id);
    assert.deepEqual(suggested, BOT_TEMPLATES.filter((template) => template.roles.includes(id)), id);
    assert.deepEqual(more, BOT_TEMPLATES.filter((template) => !template.roles.includes(id)), id);
    assert.deepEqual([...suggested, ...more].map((template) => template.id).sort(), BOT_TEMPLATES.map((template) => template.id).sort());
  }
});

test("specialist responsibilities are suggested for the relevant roles", () => {
  const examples = [
    ["developer", "software-engineer", "debugger", "software-architect", "security-reviewer", "devops-engineer", "data-engineer"],
    ["designer", "ux-researcher", "ux-designer"],
    ["product", "product-manager", "project-manager", "experiment-designer"],
    ["research", "data-analyst", "experiment-designer"],
    ["writing", "technical-writer", "content-strategist", "marketing-strategist"],
    ["operations", "customer-support", "customer-success", "sales-assistant", "finance-analyst", "recruiting-coordinator", "knowledge-manager"],
    ["general", "executive-assistant", "learning-coach", "community-manager"]
  ] as const;
  for (const [id, ...templateIds] of examples) {
    const suggested = new Set(templatesForRole({ id }).suggested.map((template) => template.id));
    for (const templateId of templateIds) assert.ok(suggested.has(templateId), `${id}: ${templateId}`);
  }
});

test("a custom role uses General's suggestions and no role suggests nothing", () => {
  assert.deepEqual(templatesForRole({ id: "custom", description: "Community organiser" }), templatesForRole({ id: "general" }));
  assert.deepEqual(templatesForRole(null), { suggested: [], more: BOT_TEMPLATES });
  assert.equal(templatesForRole({ id: "developer" }).suggested[0].id, "code-reviewer");
  assert.equal(templatesForRole({ id: "operations" }).suggested.some((template) => template.id === "process-documenter"), true);
});

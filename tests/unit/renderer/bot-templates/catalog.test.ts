import assert from "node:assert/strict";
import test from "node:test";
import { BOT_TEMPLATES, templatesForRole } from "@shared/bots/templates";
import { filterTemplates, selectedTemplate, templateRoleLabels } from "@/components/app/logic/bot-templates/catalog";
import type { TemplateFilters } from "@/components/app/types/botTemplates.types";

const defaults: TemplateFilters = { query: "", role: "all", suggestedOnly: false };
const templates = templatesForRole({ id: "developer" });

test("the full catalog keeps personalised suggestions first without changing source order", () => {
  const original = BOT_TEMPLATES.map((template) => template.id);
  const results = filterTemplates(templates, defaults);
  assert.deepEqual(results, [...templates.suggested, ...templates.more]);
  assert.equal(new Set(results.map((template) => template.id)).size, BOT_TEMPLATES.length);
  assert.deepEqual(BOT_TEMPLATES.map((template) => template.id), original);
});

test("search matches names, roles, summaries, full responsibilities and role labels", () => {
  for (const [query, expected] of [
    ["  SENTINEL  ", "security-reviewer"],
    ["DevOps", "devops-engineer"],
    ["delivery pipelines", "devops-engineer"],
    ["idempotency", "data-engineer"],
    ["Business & operations", "finance-analyst"],
    ["data   schema", "data-engineer"]
  ]) {
    assert.ok(filterTemplates(templates, { ...defaults, query }).some((template) => template.id === expected), query);
  }
  assert.deepEqual(filterTemplates(templates, { ...defaults, query: "idempotency unicornword" }), []);
});

test("role, suggestions and search filters combine", () => {
  const filters: TemplateFilters = { query: "security", role: "operations", suggestedOnly: true };
  assert.deepEqual(filterTemplates(templates, filters).map((template) => template.id), ["security-reviewer"]);
  assert.deepEqual(filterTemplates(templates, { ...filters, role: "writing" }), []);
  assert.deepEqual(filterTemplates(templatesForRole(null), { ...defaults, suggestedOnly: true }), []);
  const operations = filterTemplates(templates, { ...defaults, role: "operations" });
  assert.ok(operations.some((template) => template.id === "finance-analyst"));
  assert.ok(operations.every((template) => template.roles.includes("operations")));
});

test("selection follows visible results and clears when no results remain", () => {
  const results = filterTemplates(templates, { ...defaults, role: "designer" });
  const chosen = results.at(-1);
  assert.ok(chosen);
  assert.equal(selectedTemplate(results, chosen.id), chosen);
  assert.equal(selectedTemplate(results, "debugger"), results[0]);
  assert.equal(selectedTemplate(results, null), results[0]);
  assert.equal(selectedTemplate([], chosen.id), null);
  assert.equal(selectedTemplate([], null), null);
});

test("detail role labels reuse the existing role vocabulary", () => {
  const template = BOT_TEMPLATES.find((entry) => entry.id === "finance-analyst");
  assert.ok(template);
  assert.deepEqual(templateRoleLabels(template), ["Research & analysis", "Business & operations"]);
});

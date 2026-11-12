import assert from "node:assert/strict";
import test from "node:test";
import { summarizeThreadSkills } from "@/components/app/logic/thread-workspace/skills";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";

const at = "2026-01-01T00:00:00.000Z";

test("thread skills group evidence, prefer loads over reads, attribute agents and list the rest as available", () => {
  const items: TimelineItem[] = [
    { id: "agent", runId: "run", createdAt: at, kind: "subagent", nativeId: "agent-1", label: "Spec reader", state: "completed" },
    { id: "read", runId: "run", createdAt: at, kind: "tool", label: "Run command", output: "", state: "completed", details: { category: "command", skill: { name: "pdf", evidence: "read" } } },
    { id: "load", runId: "run", createdAt: at, kind: "tool", label: "Skill", output: "", state: "completed", details: { category: "other", parentId: "agent-1", skill: { name: "pdf", evidence: "loaded" } } },
    { id: "gone", runId: "run", createdAt: at, kind: "tool", label: "Skill", output: "", state: "completed", details: { category: "other", skill: { name: "retired", evidence: "loaded" } } },
    { id: "plain", runId: "run", createdAt: at, kind: "tool", label: "Read", output: "", state: "completed", details: { category: "file" } }
  ];
  const summary = summarizeThreadSkills(items, { status: "ready", skills: [
    { name: "simplify", description: "", scope: "system" }, { name: "pdf", description: "PDF tools", scope: "plugin", plugin: "documents" },
    { name: "code-review", description: "", scope: "user" }] });
  assert.deepEqual(summary.used.map((use) => [use.name, use.evidence, use.calls.length]), [["pdf", "loaded", 2], ["retired", "loaded", 1]]);
  assert.deepEqual(summary.used[0].agents, ["Spec reader"]);
  assert.equal(summary.used[0].skill?.plugin, "documents");
  assert.equal(summary.used[1].skill, undefined, "skills the runtime no longer offers still show as used");
  assert.deepEqual(summary.available.map((skill) => skill.name), ["code-review", "simplify"]);
  assert.deepEqual(summarizeThreadSkills(items, { status: "loading" }).available, []);
});

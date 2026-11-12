import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { skillReadEvidence } from "@main/providers/skillEvidence";
import { ClaudeToolActivity } from "@main/providers/claude/toolActivity";
import { claudeSkillScope } from "@main/providers/claude/skills";
import { normalizeCodexSkill } from "@main/providers/codex/skills";
import { normalizeCodexTool } from "@main/providers/codex/toolActivity";
import { claudeAssistantMessage } from "./toolFixtures";

test("reading a SKILL.md is read evidence for the skill named by its folder", () => {
  assert.deepEqual(skillReadEvidence("cat .claude/skills/release-notes/SKILL.md"), { skill: { name: "release-notes", evidence: "read" } });
  assert.deepEqual(skillReadEvidence("/Users/me/.codex/skills/pdf/SKILL.md"), { skill: { name: "pdf", evidence: "read" } });
  assert.deepEqual(skillReadEvidence("sed -n '1,80p' 'skills/code-review/SKILL.md' | head"), { skill: { name: "code-review", evidence: "read" } });
  assert.deepEqual(skillReadEvidence("C:\\skills\\docx\\SKILL.md"), { skill: { name: "docx", evidence: "read" } });
  for (const text of ["cat README.md", "cat skills/pdf/SKILL.md.bak", "echo SKILL.md", undefined]) assert.deepEqual(skillReadEvidence(text), {});
});

test("Claude's Skill tool is a confirmed load; reading a SKILL.md is a read", () => {
  const tools = new ClaudeToolActivity();
  const [load] = tools.accept(claudeAssistantMessage([{ type: "tool_use", id: "skill", name: "Skill", input: { skill: "pdf", args: "spec.pdf" } }]));
  assert.deepEqual(load.details?.skill, { name: "pdf", evidence: "loaded" });
  const [read] = tools.accept(claudeAssistantMessage([{ type: "tool_use", id: "read", name: "Read", input: { file_path: "/home/me/.claude/skills/docx/SKILL.md" } }]));
  assert.deepEqual(read.details?.skill, { name: "docx", evidence: "read" });
  const [other] = tools.accept(claudeAssistantMessage([{ type: "tool_use", id: "plain", name: "Read", input: { file_path: "/workspace/src/main.ts" } }]));
  assert.equal(other.details?.skill, undefined);
});

test("Codex commands that read a SKILL.md carry read evidence", () => {
  const tool = normalizeCodexTool({ id: "x", type: "commandExecution", command: "cat /repo/.agents/skills/release-notes/SKILL.md", status: "completed", exitCode: 0 },
    { id: "x", runId: "run", createdAt: "2026-01-01T00:00:00.000Z" }, true);
  assert.deepEqual(tool?.details?.skill, { name: "release-notes", evidence: "read" });
});

test("Codex skills map scopes, prefer plugin ownership and drop disabled skills", () => {
  const base = { description: "Long description", path: "/skills/x/SKILL.md", enabled: true, pluginId: null };
  assert.deepEqual(normalizeCodexSkill({ ...base, name: "repo-skill", scope: "repo", interface: { shortDescription: "Short" } }),
    { name: "repo-skill", description: "Short", scope: "workspace" });
  assert.deepEqual(normalizeCodexSkill({ ...base, name: "mine", scope: "user" }), { name: "mine", description: "Long description", scope: "user" });
  assert.deepEqual(normalizeCodexSkill({ ...base, name: "builtin", scope: "admin" })?.scope, "system");
  assert.deepEqual(normalizeCodexSkill({ ...base, name: "plugged", scope: "user", pluginId: "docs@market" }),
    { name: "plugged", description: "Long description", scope: "plugin", plugin: "docs@market" });
  assert.equal(normalizeCodexSkill({ ...base, name: "off", scope: "user", enabled: false }), null);
  assert.equal(normalizeCodexSkill({ name: "broken" }), null);
});

test("Claude skill scope comes from the plugin prefix, built-in flag or the folder that holds it", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "nora-skills-"));
  const cwd = path.join(root, "repo"); const home = path.join(root, "home");
  for (const [dir, name] of [[cwd, "both"], [home, "both"], [home, "mine"]] as const) {
    await mkdir(path.join(dir, ".claude", "skills", name), { recursive: true });
    await writeFile(path.join(dir, ".claude", "skills", name, "SKILL.md"), "---\nname: x\n---\n");
  }
  assert.deepEqual(await claudeSkillScope({ name: "documents:pdf" }, cwd, home), { scope: "plugin", plugin: "documents" });
  assert.deepEqual(await claudeSkillScope({ name: "simplify", builtin: true }, cwd, home), { scope: "system" });
  assert.deepEqual(await claudeSkillScope({ name: "both" }, cwd, home), { scope: "workspace" });
  assert.deepEqual(await claudeSkillScope({ name: "mine" }, cwd, home), { scope: "user" });
  assert.deepEqual(await claudeSkillScope({ name: "elsewhere" }, cwd, home), { scope: "unknown" });
});

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { withSkillInstallSource } from "@main/helpers/bundledSkills";
import { NORA_SKILL_REFERENCE } from "@shared/skills/bundled";

const bundledRoot = path.join(process.cwd(), "skills");

test("bundled Nora skill is staged for the installer and cleaned up afterwards", async () => {
  let staged = "";
  await withSkillInstallSource(NORA_SKILL_REFERENCE, async (source) => {
    staged = source;
    assert.notEqual(source, path.join(bundledRoot, "nora"));
    const content = await fs.readFile(path.join(source, "SKILL.md"), "utf8");
    assert.match(content, /name: nora/);
    for (const tool of ["read_task", "start_task", "finish_task"]) assert.ok(content.includes(tool));
  }, bundledRoot);
  await assert.rejects(fs.access(staged), { code: "ENOENT" });
});

test("bundled skill staging cleans up and preserves installer failures", async () => {
  let staged = "";
  const failure = new Error("Installation failed");
  await assert.rejects(withSkillInstallSource(NORA_SKILL_REFERENCE, async (source) => {
    staged = source;
    throw failure;
  }, bundledRoot), (error) => error === failure);
  await assert.rejects(fs.access(staged), { code: "ENOENT" });
});

test("registry skill references are passed to the existing installer unchanged", async () => {
  let reference = "";
  await withSkillInstallSource("owner/repo@skill", async (source) => { reference = source; });
  assert.equal(reference, "owner/repo@skill");
});

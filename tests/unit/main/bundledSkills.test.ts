import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
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

test("bundled skill staging copies nested skill files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-bundled-root-"));
  try {
    await fs.mkdir(path.join(root, "nora", "references"), { recursive: true });
    await fs.writeFile(path.join(root, "nora", "SKILL.md"), "name: nora");
    await fs.writeFile(path.join(root, "nora", "references", "tools.md"), "tools");
    await withSkillInstallSource(NORA_SKILL_REFERENCE, async (source) => {
      assert.equal(await fs.readFile(path.join(source, "SKILL.md"), "utf8"), "name: nora");
      assert.equal(await fs.readFile(path.join(source, "references", "tools.md"), "utf8"), "tools");
    }, root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
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

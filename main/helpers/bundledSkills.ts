import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NORA_SKILL_REFERENCE } from "@shared/skills/bundled";

/** External skill installers cannot read Electron's asar filesystem. */
export async function withSkillInstallSource(
  reference: string,
  install: (source: string) => Promise<void>,
  bundledRoot = path.join(__dirname, "..", "..", "skills")
): Promise<void> {
  if (reference !== NORA_SKILL_REFERENCE) return install(reference);
  const stagingRoot = await fs.mkdtemp(path.join(os.tmpdir(), "nora-bundled-skill-"));
  try {
    const source = path.join(stagingRoot, "nora");
    await copyDirectory(path.join(bundledRoot, "nora"), source);
    await install(source);
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }
}

/**
 * Copies a directory using only calls Electron's asar layer supports. `fs.cp` is not asar-aware, so it fails with
 * ENOENT when the bundled skill is read from inside `app.asar` in packaged builds.
 */
async function copyDirectory(from: string, to: string): Promise<void> {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDirectory(source, target);
    else if (entry.isFile()) await fs.writeFile(target, await fs.readFile(source));
  }
}

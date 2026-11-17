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
    await fs.cp(path.join(bundledRoot, "nora"), source, { recursive: true });
    await install(source);
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }
}

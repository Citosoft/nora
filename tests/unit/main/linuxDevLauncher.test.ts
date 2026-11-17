import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("Linux dev launcher installs the Nora icon and matching identity from any working directory", {
  skip: process.platform !== "linux"
}, async () => {
  const root = process.cwd();
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "nora-desktop-"));
  try {
    execFileSync(process.execPath, [path.join(root, "scripts", "install-linux-dev-launcher.mjs")], {
      cwd: dataDir,
      env: { ...process.env, XDG_DATA_HOME: dataDir },
      stdio: "pipe"
    });

    const desktop = await readFile(path.join(dataDir, "applications", "nora-dev.desktop"), "utf8");
    assert.match(desktop, /^StartupWMClass=nora-dev$/m);
    assert.ok(desktop.includes(`Path=${root}\n`));
    assert.ok(desktop.includes(path.join(root, "scripts", "dev.mjs")));

    const iconName = /^Icon=(.+)$/m.exec(desktop)?.[1];
    assert.ok(iconName, "The launcher must reference its installed icon");
    const iconsDir = path.join(dataDir, "icons", "hicolor", "256x256", "apps");
    assert.deepEqual(await readFile(path.join(iconsDir, `${iconName}.png`)), await readFile(path.join(root, "renderer", "icon-256.png")));

    // Reinstalling must retain a single valid launcher icon.
    execFileSync(process.execPath, [path.join(root, "scripts", "install-linux-dev-launcher.mjs")], {
      cwd: dataDir,
      env: { ...process.env, XDG_DATA_HOME: dataDir },
      stdio: "pipe"
    });
    assert.deepEqual(await readdir(iconsDir), [`${iconName}.png`]);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

/**
 * Makes sure Electron's binary is present after install, in case electron's own postinstall did not run or
 * left no binary. Delegates to electron's installer (which no-ops when the binary is already there) instead
 * of re-implementing download and extraction, then fails loudly if the executable is still missing.
 */
const require = createRequire(import.meta.url);
const electronRoot = path.dirname(require.resolve("electron/package.json"));

const install = spawnSync(process.execPath, [path.join(electronRoot, "install.js")], { stdio: "inherit" });
if (install.error) throw install.error;
if (install.status !== 0) process.exit(install.status ?? 1);

const executablePath = (await readFile(path.join(electronRoot, "path.txt"), "utf8")).trim();
await access(process.env.ELECTRON_OVERRIDE_DIST_PATH
  ? path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath)
  : path.join(electronRoot, "dist", executablePath));

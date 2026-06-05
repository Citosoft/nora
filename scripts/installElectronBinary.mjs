import { downloadArtifact } from "@electron/get";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const electronPackageRoot = path.join(root, "node_modules", "electron");
const electronPackage = require(path.join(electronPackageRoot, "package.json"));
const checksums = require(path.join(electronPackageRoot, "checksums.json"));
const distPath = path.join(electronPackageRoot, "dist");
const pathFile = path.join(electronPackageRoot, "path.txt");
const versionFile = path.join(distPath, "version");

const isWindows = process.platform === "win32";
const platform = process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || process.platform;
const arch = process.env.ELECTRON_INSTALL_ARCH || process.env.npm_config_arch || process.arch;
const platformExecutablePath = getPlatformExecutablePath(platform);
const electronExecutablePath = path.join(distPath, platformExecutablePath);

if (await isElectronInstalled()) {
  process.exit(0);
}

await rm(distPath, { recursive: true, force: true });
await mkdir(distPath, { recursive: true });

const zipPath = await downloadArtifact({
  version: electronPackage.version,
  artifactName: "electron",
  cacheRoot: process.env.electron_config_cache,
  checksums: process.env.electron_use_remote_checksums || process.env.npm_config_electron_use_remote_checksums
    ? undefined
    : checksums,
  platform,
  arch
});

await extractElectronZip(zipPath, distPath);
await writeFile(pathFile, platformExecutablePath);
await access(electronExecutablePath);

async function isElectronInstalled() {
  try {
    const [installedVersion, installedExecutablePath] = await Promise.all([
      readFile(versionFile, "utf8"),
      readFile(pathFile, "utf8")
    ]);

    if (installedVersion.trim().replace(/^v/, "") !== electronPackage.version) {
      return false;
    }

    if (installedExecutablePath !== platformExecutablePath) {
      return false;
    }

    await access(electronExecutablePath);
    return true;
  } catch {
    return false;
  }
}

function getPlatformExecutablePath(electronPlatform) {
  switch (electronPlatform) {
    case "mas":
    case "darwin":
      return "Electron.app/Contents/MacOS/Electron";
    case "freebsd":
    case "openbsd":
    case "linux":
      return "electron";
    case "win32":
      return "electron.exe";
    default:
      throw new Error(`Electron builds are not available on platform: ${electronPlatform}`);
  }
}

function extractElectronZip(zipPath, targetDir) {
  if (isWindows) {
    return runCommand("powershell.exe", [
      "-NoProfile",
      "-Command",
      "Expand-Archive",
      "-LiteralPath",
      zipPath,
      "-DestinationPath",
      targetDir,
      "-Force"
    ]);
  }

  return runCommand("unzip", ["-oq", zipPath, "-d", targetDir]);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} terminated with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
        return;
      }

      resolve();
    });
  });
}

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";

if (process.platform !== "linux") {
  throw new Error("Linux dev launcher installation is only supported on Linux.");
}

const root = process.cwd();
const desktopDir = path.join(os.homedir(), ".local", "share", "applications");
const iconDir = path.join(os.homedir(), ".local", "share", "icons", "hicolor", "256x256", "apps");
const desktopFilePath = path.join(desktopDir, "nora-dev.desktop");
const iconSourcePath = path.join(root, "renderer", "icon-256.png");
const iconHash = createHash("sha1").update(await readFile(iconSourcePath)).digest("hex").slice(0, 8);
const iconName = `nora-dev-${iconHash}`;
const iconThemePath = path.join(iconDir, `${iconName}.png`);
const execCommand = `${escapeExecArg(process.execPath)} ${escapeExecArg(path.join(root, "scripts", "dev.mjs"))}`;

const desktopFile = [
  "[Desktop Entry]",
  "Version=1.0",
  "Type=Application",
  "Name=Nora Dev",
  "Comment=Run the Nora development app",
  `Exec=${execCommand}`,
  `Path=${root}`,
  `Icon=${iconName}`,
  "Terminal=false",
  "Categories=Development;IDE;",
  "StartupNotify=true",
  "StartupWMClass=Nora",
  "X-GNOME-WMClass=Nora",
  ""
].join("\n");

await mkdir(desktopDir, { recursive: true });
await mkdir(iconDir, { recursive: true });
await cp(iconSourcePath, iconThemePath);
await writeFile(desktopFilePath, desktopFile, "utf8");
await removeOldDevIcons(iconDir, iconName);
await runIfAvailable("update-desktop-database", [desktopDir]);
await runIfAvailable("gtk-update-icon-cache", ["-f", path.join(os.homedir(), ".local", "share", "icons", "hicolor")]);

console.log(`Installed Linux dev launcher at ${desktopFilePath}`);
console.log(`Installed Linux dev icon at ${iconThemePath}`);

function escapeExecArg(value) {
  return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

async function removeOldDevIcons(directory, activeIconName) {
  const entries = await readdir(directory);
  await Promise.all(
    entries
      .filter((entry) => entry.startsWith("nora-dev-") && entry.endsWith(".png") && entry !== `${activeIconName}.png`)
      .map((entry) => rm(path.join(directory, entry), { force: true }))
  );
}

function runIfAvailable(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "ignore",
      shell: false
    });

    child.on("error", () => resolve());
    child.on("exit", () => resolve());
  });
}

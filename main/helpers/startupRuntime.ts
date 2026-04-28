import { app } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function loadEnvFile(cwd: string): void {
  const envPath = path.resolve(cwd, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function spawnSquirrelUpdate(args: string[]): void {
  const appFolder = path.resolve(process.execPath, "..");
  const updateExePath = path.resolve(appFolder, "..", "Update.exe");

  try {
    spawn(updateExePath, args, {
      detached: true,
      stdio: "ignore"
    }).unref();
  } catch (error) {
    console.error("Failed to run Squirrel Update.exe.", error);
  }
}

export function handleSquirrelLifecycle(squirrelWindowLifetimeMs: number): boolean {
  if (process.platform !== "win32") {
    return false;
  }

  const squirrelEvent = process.argv.find((argument) => argument.startsWith("--squirrel-"));
  if (!squirrelEvent) {
    return false;
  }

  const executableName = path.basename(process.execPath);

  switch (squirrelEvent) {
    case "--squirrel-install":
    case "--squirrel-updated":
      spawnSquirrelUpdate(["--createShortcut", executableName]);
      break;
    case "--squirrel-uninstall":
      spawnSquirrelUpdate(["--removeShortcut", executableName]);
      break;
    case "--squirrel-obsolete":
      break;
    default:
      return false;
  }

  setTimeout(() => {
    app.quit();
  }, squirrelWindowLifetimeMs);

  return true;
}

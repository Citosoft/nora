import { spawn } from "node:child_process";
import { watch as watchFs } from "node:fs";
import { access, cp, mkdir, rm } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { context } from "esbuild";

const root = process.cwd();
const isWindows = process.platform === "win32";
const nodeExe = process.execPath;
const tscCli = path.join(root, "node_modules", "typescript", "bin", "tsc");
const tscAliasCli = path.join(root, "node_modules", "tsc-alias", "dist", "bin", "index.js");
const tailwindCli = path.join(root, "node_modules", "tailwindcss", "lib", "cli.js");
const generateIconsScript = path.join(root, "scripts", "generate-icons.mjs");
const generateOAuthBuildConfigScript = path.join(root, "scripts", "generate-oauth-build-config.mjs");
const electronExe = isWindows
  ? path.join(root, "node_modules", "electron", "dist", "electron.exe")
  : path.join(root, "node_modules", ".bin", "electron");
const rendererDir = path.join(root, "renderer");
const mainSourceDir = path.join(root, "main");
const sharedSourceDir = path.join(root, "shared");
const distMainPath = path.join(root, "dist", "main", "main.js");
const distPreloadPath = path.join(root, "dist", "main", "preload.js");
const distRendererBundlePath = path.join(root, "dist", "renderer", "bundle.js");
const distRendererCssPath = path.join(root, "dist", "renderer", "styles.css");
const distRendererIndexPath = path.join(root, "dist", "renderer", "index.html");
const disableGpu = process.argv.includes("--disable-gpu");
const forwardedElectronArgs = process.argv.slice(2).filter((arg) => arg !== "--disable-gpu");

let electronProcess = null;
let restartTimer = null;
let startTimer = null;

function spawnLongRunning(command, args, label, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: {
      ...process.env,
      ...extraEnv
    },
    stdio: "inherit",
    shell: false
  });

  child.on("exit", (code, signal) => {
    if (signal === "SIGTERM") {
      return;
    }
    console.error(`[${label}] exited with code ${code ?? "unknown"}`);
  });

  return child;
}

function runCommand(command, args, label, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: {
        ...process.env,
        ...extraEnv
      },
      stdio: "inherit",
      shell: false
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`[${label}] terminated with signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`[${label}] exited with code ${code ?? "unknown"}`));
        return;
      }
      resolve();
    });

    child.on("error", reject);
  });
}

async function copyStatic() {
  await mkdir(path.join(root, "dist", "renderer"), { recursive: true });
  await mkdir(path.join(root, "dist", "runtime"), { recursive: true });
  await runCommand(nodeExe, [generateOAuthBuildConfigScript], "oauth-build-config");
  await runCommand(nodeExe, [generateIconsScript], "icons");
  await cp(path.join(root, "renderer", "index.html"), path.join(root, "dist", "renderer", "index.html"));
  await cp(path.join(root, "renderer", "icon.svg"), path.join(root, "dist", "renderer", "icon.svg"));
  await cp(path.join(root, "renderer", "icon.png"), path.join(root, "dist", "renderer", "icon.png"));
  await cp(path.join(root, "renderer", "icon-256.png"), path.join(root, "dist", "renderer", "icon-256.png"));
  await cp(path.join(root, "renderer", "icon.ico"), path.join(root, "dist", "renderer", "icon.ico"));
  await cp(path.join(root, "renderer", "icon.icns"), path.join(root, "dist", "renderer", "icon.icns"));
}

function watchStatic() {
  void copyStatic();

  const watcher = watchFs(rendererDir, { recursive: true }, (_eventType, filename) => {
    if (filename !== "index.html" && filename !== "icon.svg") {
      return;
    }
    void copyStatic();
  });

  return () => watcher.close();
}

function watchEnvFile() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    return () => {};
  }

  const watcher = watchFs(envPath, () => {
    void runCommand(nodeExe, [generateOAuthBuildConfigScript], "oauth-build-config")
      .then(() => {
        scheduleElectronRestart();
      })
      .catch((error) => {
        console.error(error);
      });
  });

  return () => watcher.close();
}

async function watchPreloadBundle() {
  await rm(path.join(root, "dist", "main", "preload"), { recursive: true, force: true });

  const ctx = await context({
    entryPoints: [path.join(root, "main", "preload.ts")],
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "es2022",
    outfile: distPreloadPath,
    external: ["electron"],
    sourcemap: true,
    tsconfig: path.join(root, "tsconfig.json")
  });

  await ctx.watch();
  return () => ctx.dispose();
}

async function watchRendererBundle() {
  const ctx = await context({
    entryPoints: ["renderer/main.tsx"],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    outfile: "dist/renderer/bundle.js",
    jsx: "automatic",
    sourcemap: true,
    define: {
      __NORA_IS_PRODUCTION__: "false",
      __NORA_POSTHOG_API_KEY__: JSON.stringify(process.env.NORA_POSTHOG_API_KEY ?? ""),
      __NORA_POSTHOG_HOST__: JSON.stringify(process.env.NORA_POSTHOG_HOST ?? ""),
      __VITE_PUBLIC_POSTHOG_PROJECT_TOKEN__: JSON.stringify(process.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN ?? ""),
      __VITE_PUBLIC_POSTHOG_HOST__: JSON.stringify(process.env.VITE_PUBLIC_POSTHOG_HOST ?? ""),
      __NPM_PACKAGE_VERSION__: JSON.stringify(process.env.npm_package_version ?? "")
    },
    tsconfig: "tsconfig.json",
    loader: {
      ".ts": "ts",
      ".tsx": "tsx"
    }
  });

  await ctx.watch();
  return () => ctx.dispose();
}

function stopElectron() {
  if (!electronProcess) {
    return;
  }
  electronProcess.kill();
  electronProcess = null;
}

function startElectron() {
  stopElectron();
  electronProcess = spawnLongRunning(
    electronExe,
    [".", ...forwardedElectronArgs],
    "electron",
    {
      NORA_DEV_WATCH: "1",
      ...(disableGpu ? { NORA_DISABLE_HARDWARE_ACCELERATION: "1" } : {})
    }
  );
}

function scheduleElectronStart() {
  if (electronProcess || startTimer) {
    return;
  }

  startTimer = setTimeout(() => {
    startTimer = null;
    startElectron();
  }, 250);
}

function scheduleElectronRestart() {
  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    restartTimer = null;
    startElectron();
  }, 300);
}

function watchMainBuild() {
  const watchers = [mainSourceDir, sharedSourceDir].map((dirPath) =>
    watchFs(dirPath, { recursive: true }, (_eventType, filename) => {
      const changed = typeof filename === "string" ? filename : "";
      if (!changed.endsWith(".ts") && !changed.endsWith(".tsx")) {
        return;
      }
      scheduleElectronRestart();
    })
  );

  return () => {
    for (const watcher of watchers) {
      watcher.close();
    }
  };
}

async function waitForBuildOutputs() {
  while (true) {
    try {
      await Promise.all([
        access(distMainPath),
        access(distPreloadPath),
        access(distRendererBundlePath),
        access(distRendererCssPath),
        access(distRendererIndexPath)
      ]);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
}

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
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
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile();

async function main() {
  const processes = [];
  const cleanupFns = [];

  processes.push(
    spawnLongRunning(
      nodeExe,
      [tscCli, "--watch", "--preserveWatchOutput"],
      "tsc"
    )
  );

  processes.push(
    spawnLongRunning(
      nodeExe,
      [tscAliasCli, "-p", "tsconfig.json", "-w"],
      "tsc-alias"
    )
  );

  processes.push(
    spawnLongRunning(
      nodeExe,
      [tailwindCli, "-i", "renderer/styles.css", "-o", "dist/renderer/styles.css", "--watch"],
      "tailwind"
    )
  );

  cleanupFns.push(await watchPreloadBundle());
  cleanupFns.push(await watchRendererBundle());
  cleanupFns.push(watchStatic());
  cleanupFns.push(watchEnvFile());

  await waitForBuildOutputs();
  scheduleElectronStart();
  cleanupFns.push(watchMainBuild());

  const shutdown = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
    }
    if (startTimer) {
      clearTimeout(startTimer);
    }
    stopElectron();
    for (const child of processes) {
      child.kill();
    }
    for (const cleanup of cleanupFns) {
      cleanup();
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

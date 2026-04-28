import type { StartupDependency, StartupDependencyId, StartupDependencyReport } from "@shared/types/startupDependency.types";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { buildProcessEnv } from "./processEnv";
import { findExecutableOnPath } from "./processLookup";
import { detectDirectSshSupport, detectRemoteMountSupport, findSshExecutable, installRemoteMountSupport } from "./remoteMounts";

const execFileAsync = promisify(execFile);

function isWindows(): boolean {
  return process.platform === "win32";
}

function isMac(): boolean {
  return process.platform === "darwin";
}

function nowIso(): string {
  return new Date().toISOString();
}

async function findGitExecutable(): Promise<string | null> {
  if (isWindows()) {
    return findExecutableOnPath(["git.exe", "git"], true);
  }

  return findExecutableOnPath(["git"], false);
}

async function findNodePackageExecutable(command: "npm" | "npx"): Promise<string | null> {
  if (isWindows()) {
    return findExecutableOnPath([`${command}.cmd`, `${command}.exe`, command], true);
  }

  return findExecutableOnPath([command], false);
}

async function hasCommand(command: string): Promise<boolean> {
  return Boolean(await findExecutableOnPath([command], isWindows()));
}

async function canAutoInstallGit(): Promise<boolean> {
  if (isWindows()) {
    return hasCommand("winget");
  }

  if (isMac()) {
    return hasCommand("brew");
  }

  return (await hasCommand("apt-get")) && (await hasCommand("pkexec"));
}

async function installGitDependency(): Promise<void> {
  if (isWindows()) {
    const wingetPath = await findExecutableOnPath(["winget"], true);
    if (!wingetPath) {
      throw new Error("winget is not available on this machine.");
    }

    await execFileAsync(wingetPath, [
      "install",
      "--id",
      "Git.Git",
      "--exact",
      "--accept-package-agreements",
      "--accept-source-agreements",
      "--disable-interactivity"
    ], {
      windowsHide: false,
      maxBuffer: 1024 * 1024,
      env: buildProcessEnv(process.env)
    });
    return;
  }

  if (isMac()) {
    const brewPath = await findExecutableOnPath(["brew"], false);
    if (!brewPath) {
      throw new Error("Homebrew is not available on this machine.");
    }

    await execFileAsync(brewPath, ["install", "git"], {
      maxBuffer: 1024 * 1024,
      env: buildProcessEnv(process.env)
    });
    return;
  }

  const pkexecPath = await findExecutableOnPath(["pkexec"], false);
  const aptGetPath = await findExecutableOnPath(["apt-get"], false);
  if (!pkexecPath || !aptGetPath) {
    throw new Error("Automatic Git installation requires both pkexec and apt-get.");
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(pkexecPath, ["/bin/sh", "-lc", `apt-get update && DEBIAN_FRONTEND=noninteractive ${aptGetPath} install -y git`], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: buildProcessEnv(process.env)
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `Git installation failed with exit code ${code ?? 1}.`));
    });
  });
}

function getGitManualInstructions(): string[] {
  if (isWindows()) {
    return [
      "Install Git from https://git-scm.com/download/win, or run `winget install --id Git.Git --exact` in PowerShell.",
      "Restart Nora after installation so the app process can detect git on PATH."
    ];
  }

  if (isMac()) {
    return [
      "Install Git with Homebrew using `brew install git`, or install the Xcode Command Line Tools.",
      "Restart Nora after installation so the app process can detect git on PATH."
    ];
  }

  return [
    "Install Git with your package manager, for example `sudo apt-get update && sudo apt-get install -y git`.",
    "Restart Nora after installation so the app process can detect git on PATH."
  ];
}

async function createGitDependency(): Promise<StartupDependency> {
  const gitPath = await findGitExecutable();
  const canAutoInstall = !gitPath && await canAutoInstallGit();

  return {
    id: "git",
    label: "Git",
    severity: "mandatory",
    status: gitPath ? "available" : "missing",
    summary: gitPath
      ? "Git is available for repository selection, worktrees, status, commits, and branch operations."
      : "Git is required. Nora cannot open repositories or manage worktrees without it.",
    detectedPath: gitPath,
    installHint: gitPath
      ? null
      : canAutoInstall
        ? "Nora can install Git automatically on this machine."
        : "Install Git manually, then relaunch Nora.",
    canAutoInstall,
    autoInstallLabel: canAutoInstall ? "Install Git" : null,
    manualInstructions: getGitManualInstructions()
  };
}

function getNodePackageManagerManualInstructions(command: "npm" | "npx"): string[] {
  if (isWindows()) {
    return [
      `Install Node.js LTS from https://nodejs.org/en/download so \`${command}\` is available to the Nora process.`,
      "Restart Nora after installation so the app process can detect Node.js tools on PATH."
    ];
  }

  if (isMac()) {
    return [
      `Install Node.js LTS (for example with Homebrew: \`brew install node\`) so \`${command}\` is available.`,
      "Restart Nora after installation so the app process can detect Node.js tools on PATH."
    ];
  }

  return [
    `Install Node.js LTS with your package manager so \`${command}\` is available (for example \`sudo apt-get install -y nodejs npm\`).`,
    "Restart Nora after installation so the app process can detect Node.js tools on PATH."
  ];
}

async function createNpmDependency(): Promise<StartupDependency> {
  const npmPath = await findNodePackageExecutable("npm");

  return {
    id: "npm",
    label: "npm",
    severity: "optional",
    status: npmPath ? "available" : "missing",
    summary: npmPath
      ? "npm is available for installing and updating agent CLIs and skills."
      : "npm is missing. Nora cannot run npm-based CLI installs or npm exec fallback flows until it is installed.",
    detectedPath: npmPath,
    installHint: npmPath ? null : "Install Node.js so npm is available.",
    canAutoInstall: false,
    autoInstallLabel: null,
    manualInstructions: getNodePackageManagerManualInstructions("npm")
  };
}

async function createNpxDependency(): Promise<StartupDependency> {
  const npxPath = await findNodePackageExecutable("npx");

  return {
    id: "npx",
    label: "npx",
    severity: "optional",
    status: npxPath ? "available" : "missing",
    summary: npxPath
      ? "npx is available for CLI bootstrap and skills command fallback."
      : "npx is missing. Nora cannot use npx-based CLI bootstrap and skills fallback commands until it is installed.",
    detectedPath: npxPath,
    installHint: npxPath ? null : "Install Node.js so npx is available.",
    canAutoInstall: false,
    autoInstallLabel: null,
    manualInstructions: getNodePackageManagerManualInstructions("npx")
  };
}

function getSshClientManualInstructions(): string[] {
  if (isWindows()) {
    return [
      "Install the Windows OpenSSH Client optional feature, or install Git for Windows and ensure `ssh.exe` is available to the Nora process.",
      "Restart Nora after installation."
    ];
  }

  if (isMac()) {
    return [
      "Install the macOS command line developer tools if `ssh` is missing.",
      "Restart Nora after installation."
    ];
  }

  return [
    "Install an SSH client package such as `openssh-client` with your package manager.",
    "Restart Nora after installation."
  ];
}

async function createSshClientDependency(): Promise<StartupDependency> {
  const sshPath = await findSshExecutable();
  const directSshSupport = await detectDirectSshSupport();

  return {
    id: "ssh-client",
    label: "SSH Client",
    severity: "optional",
    status: directSshSupport.supported ? "available" : "missing",
    summary: directSshSupport.supported
      ? "SSH is available for direct SSH workspaces and remote repository commands."
      : directSshSupport.reason || "SSH is unavailable, so direct SSH workspaces are disabled.",
    detectedPath: sshPath,
    installHint: directSshSupport.supported ? null : "Install an SSH client to enable direct SSH workspaces.",
    canAutoInstall: false,
    autoInstallLabel: null,
    manualInstructions: getSshClientManualInstructions()
  };
}

async function createSshMountDependency(): Promise<StartupDependency> {
  const mountSupport = await detectRemoteMountSupport();

  return {
    id: "ssh-mount",
    label: "SSH Mount Support",
    severity: "optional",
    status: mountSupport.supported ? "available" : "missing",
    summary: mountSupport.supported
      ? "Remote mount support is available for SSH-backed mounted workspaces."
      : mountSupport.reason || "SSH mount support is unavailable.",
    detectedPath: null,
    installHint: mountSupport.installHint,
    canAutoInstall: mountSupport.canAutoInstall,
    autoInstallLabel: mountSupport.canAutoInstall ? "Install mount support" : null,
    manualInstructions: [
      ...(mountSupport.installHint ? [mountSupport.installHint] : []),
      ...(mountSupport.bootstrapScript ? [mountSupport.bootstrapScript] : []),
      "Restart Nora after installation."
    ]
  };
}

export async function getStartupDependencyReport(): Promise<StartupDependencyReport> {
  const dependencies = await Promise.all([
    createGitDependency(),
    createNpmDependency(),
    createNpxDependency(),
    createSshClientDependency(),
    createSshMountDependency()
  ]);

  return {
    checkedAt: nowIso(),
    dependencies
  };
}

export async function installStartupDependency(dependencyId: StartupDependencyId): Promise<StartupDependencyReport> {
  if (dependencyId === "git") {
    await installGitDependency();
    return getStartupDependencyReport();
  }

  if (dependencyId === "ssh-mount") {
    await installRemoteMountSupport();
    return getStartupDependencyReport();
  }

  throw new Error("Automatic installation is not available for this dependency.");
}

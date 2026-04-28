import type { InstalledIde } from "@shared/appTypes";
import { app, nativeImage } from "electron";
import { execFile, spawn } from "node:child_process";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { buildMacAppBundleSearchPaths, getMacAppBundleBaseName, resolveIdeIconSourcePath, resolveMacAppBundlePath } from "./ideIconPath";
import { buildProcessEnv } from "./processEnv";
import type { IdeDefinition } from "./types/internal.types";

const IDE_DEFINITIONS: IdeDefinition[] = [
  {
    id: "vscode",
    name: "Visual Studio Code",
    windowsCandidates: [
      "%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe",
      "%PROGRAMFILES%\\Microsoft VS Code\\Code.exe",
      "%PROGRAMFILES(X86)%\\Microsoft VS Code\\Code.exe"
    ],
    windowsPathCommands: ["code"],
    macExecutables: ["/Applications/Visual Studio Code.app/Contents/MacOS/Electron"],
    linuxCandidates: ["/usr/share/code/code", "/var/lib/flatpak/app/com.visualstudio.code/current/active/export/bin/com.visualstudio.code"],
    linuxPathCommands: ["code"]
  },
  {
    id: "vscode-insiders",
    name: "Visual Studio Code Insiders",
    windowsCandidates: [
      "%LOCALAPPDATA%\\Programs\\Microsoft VS Code Insiders\\Code - Insiders.exe",
      "%PROGRAMFILES%\\Microsoft VS Code Insiders\\Code - Insiders.exe",
      "%PROGRAMFILES(X86)%\\Microsoft VS Code Insiders\\Code - Insiders.exe"
    ],
    windowsPathCommands: ["code-insiders"],
    macExecutables: ["/Applications/Visual Studio Code - Insiders.app/Contents/MacOS/Electron"],
    linuxCandidates: ["/usr/share/code-insiders/code-insiders"],
    linuxPathCommands: ["code-insiders"]
  },
  {
    id: "cursor",
    name: "Cursor",
    windowsCandidates: [
      "%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe",
      "%PROGRAMFILES%\\Cursor\\Cursor.exe"
    ],
    windowsPathCommands: ["cursor"],
    macExecutables: ["/Applications/Cursor.app/Contents/MacOS/Cursor"],
    linuxCandidates: ["/opt/Cursor/cursor", "/usr/share/cursor/cursor"],
    linuxPathCommands: ["cursor"]
  },
  {
    id: "windsurf",
    name: "Windsurf",
    windowsCandidates: [
      "%LOCALAPPDATA%\\Programs\\Windsurf\\Windsurf.exe",
      "%PROGRAMFILES%\\Windsurf\\Windsurf.exe"
    ],
    macExecutables: ["/Applications/Windsurf.app/Contents/MacOS/Windsurf"],
    linuxCandidates: ["/opt/Windsurf/windsurf", "/usr/share/windsurf/windsurf"],
    linuxPathCommands: ["windsurf"]
  },
  {
    id: "vscodium",
    name: "VSCodium",
    windowsCandidates: [
      "%LOCALAPPDATA%\\Programs\\VSCodium\\VSCodium.exe",
      "%PROGRAMFILES%\\VSCodium\\VSCodium.exe"
    ],
    windowsPathCommands: ["codium"],
    macExecutables: ["/Applications/VSCodium.app/Contents/MacOS/Electron"],
    linuxCandidates: ["/usr/share/codium/codium"],
    linuxPathCommands: ["codium"]
  },
  {
    id: "zed",
    name: "Zed",
    windowsCandidates: [
      "%LOCALAPPDATA%\\Programs\\Zed\\Zed.exe",
      "%PROGRAMFILES%\\Zed\\Zed.exe"
    ],
    macExecutables: ["/Applications/Zed.app/Contents/MacOS/zed"],
    linuxCandidates: ["/opt/zed/zed", "/usr/lib/zed/zed-editor"],
    linuxPathCommands: ["zed"]
  },
  {
    id: "intellij-idea",
    name: "IntelliJ IDEA",
    windowsExecutables: ["idea64.exe", "idea.exe"],
    windowsJetBrainsMatchers: ["intellij idea"],
    windowsPathCommands: ["idea64", "idea"],
    macExecutables: [
      "/Applications/IntelliJ IDEA.app/Contents/MacOS/idea",
      "/Applications/IntelliJ IDEA Ultimate.app/Contents/MacOS/idea"
    ],
    linuxPathCommands: ["idea", "idea64"]
  },
  {
    id: "webstorm",
    name: "WebStorm",
    windowsExecutables: ["webstorm64.exe", "webstorm.exe"],
    windowsJetBrainsMatchers: ["webstorm"],
    windowsPathCommands: ["webstorm64", "webstorm"],
    macExecutables: ["/Applications/WebStorm.app/Contents/MacOS/webstorm"],
    linuxPathCommands: ["webstorm", "webstorm64"]
  },
  {
    id: "pycharm",
    name: "PyCharm",
    windowsExecutables: ["pycharm64.exe", "pycharm.exe"],
    windowsJetBrainsMatchers: ["pycharm"],
    windowsPathCommands: ["pycharm64", "pycharm"],
    macExecutables: ["/Applications/PyCharm.app/Contents/MacOS/pycharm"],
    linuxPathCommands: ["pycharm", "pycharm64"]
  },
  {
    id: "goland",
    name: "GoLand",
    windowsExecutables: ["goland64.exe", "goland.exe"],
    windowsJetBrainsMatchers: ["goland"],
    windowsPathCommands: ["goland64", "goland"],
    macExecutables: ["/Applications/GoLand.app/Contents/MacOS/goland"],
    linuxPathCommands: ["goland", "goland64"]
  },
  {
    id: "rider",
    name: "Rider",
    windowsExecutables: ["rider64.exe", "rider.exe"],
    windowsJetBrainsMatchers: ["rider"],
    windowsPathCommands: ["rider64", "rider"],
    macExecutables: ["/Applications/Rider.app/Contents/MacOS/rider"],
    linuxPathCommands: ["rider", "rider64"]
  },
  {
    id: "phpstorm",
    name: "PhpStorm",
    windowsExecutables: ["phpstorm64.exe", "phpstorm.exe"],
    windowsJetBrainsMatchers: ["phpstorm"],
    windowsPathCommands: ["phpstorm64", "phpstorm"],
    macExecutables: ["/Applications/PhpStorm.app/Contents/MacOS/phpstorm"],
    linuxPathCommands: ["phpstorm", "phpstorm64"]
  },
  {
    id: "clion",
    name: "CLion",
    windowsExecutables: ["clion64.exe", "clion.exe"],
    windowsJetBrainsMatchers: ["clion"],
    windowsPathCommands: ["clion64", "clion"],
    macExecutables: ["/Applications/CLion.app/Contents/MacOS/clion"],
    linuxPathCommands: ["clion", "clion64"]
  },
  {
    id: "fleet",
    name: "JetBrains Fleet",
    windowsExecutables: ["fleet.exe"],
    windowsJetBrainsMatchers: ["fleet"],
    windowsPathCommands: ["fleet"],
    macExecutables: ["/Applications/Fleet.app/Contents/MacOS/Fleet"],
    linuxPathCommands: ["fleet"]
  },
  {
    id: "android-studio",
    name: "Android Studio",
    windowsCandidates: [
      "%PROGRAMFILES%\\Android\\Android Studio\\bin\\studio64.exe",
      "%LOCALAPPDATA%\\Programs\\Android Studio\\bin\\studio64.exe"
    ],
    windowsExecutables: ["studio64.exe", "studio.exe"],
    windowsJetBrainsMatchers: ["android studio"],
    windowsPathCommands: ["studio64", "studio"],
    macExecutables: ["/Applications/Android Studio.app/Contents/MacOS/studio"],
    linuxCandidates: ["/opt/android-studio/bin/studio.sh"],
    linuxPathCommands: ["studio.sh", "studio"]
  }
];

const execFileAsync = promisify(execFile);

function expandEnvPath(candidate: string): string {
  return candidate.replace(/%([^%]+)%/g, (_match, variable) => process.env[variable] ?? "");
}

async function toExistingFile(filePath: string | null | undefined): Promise<string | null> {
  if (!filePath) {
    return null;
  }

  try {
    const stats = await fsPromises.stat(filePath);
    return stats.isFile() ? filePath : null;
  } catch {
    return null;
  }
}

async function uniquePaths(paths: Array<string | null | undefined>): Promise<string[]> {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const candidate of paths) {
    const existing = await toExistingFile(candidate);
    if (!existing) {
      continue;
    }

    const normalized = process.platform === "win32" ? existing.toLowerCase() : existing;
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    results.push(existing);
  }

  return results;
}

async function collectJetBrainsWindowsCandidates(matchers: string[], executableNames: string[]): Promise<string[]> {
  const directoryRoots = [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Programs", "JetBrains") : null,
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "JetBrains") : null,
    process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "JetBrains") : null
  ].filter((value): value is string => Boolean(value));

  const results: string[] = [];
  for (const root of directoryRoots) {
    try {
      const entries = await fsPromises.readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const entryName = entry.name.toLowerCase();
        if (!matchers.some((matcher) => entryName.includes(matcher))) {
          continue;
        }

        for (const executableName of executableNames) {
          results.push(path.join(root, entry.name, "bin", executableName));
        }
      }
    } catch {
      continue;
    }
  }

  return results;
}

async function resolveCommandOnPath(commands: string[]): Promise<string[]> {
  if (!commands.length) {
    return [];
  }

  const locator = process.platform === "win32" ? "where.exe" : "which";
  const resolved: string[] = [];

  for (const commandName of commands) {
    try {
      const result = await execFileAsync(locator, [commandName], {
        encoding: "utf8",
        windowsHide: true,
        env: buildProcessEnv(process.env)
      });
      if (!result.stdout) {
        continue;
      }

      const lines = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      resolved.push(...lines);
    } catch {
      continue;
    }
  }

  return resolved;
}

async function collectCandidates(definition: IdeDefinition): Promise<string[]> {
  if (process.platform === "win32") {
    const directCandidates = (definition.windowsCandidates ?? []).map(expandEnvPath);
    const jetBrainsCandidates =
      definition.windowsExecutables && definition.windowsJetBrainsMatchers
        ? await collectJetBrainsWindowsCandidates(definition.windowsJetBrainsMatchers, definition.windowsExecutables)
        : [];
    const pathResolved = await resolveCommandOnPath(definition.windowsPathCommands ?? []);
    return uniquePaths([...directCandidates, ...jetBrainsCandidates, ...pathResolved]);
  }

  if (process.platform === "darwin") {
    const pathResolved = await resolveCommandOnPath(definition.linuxPathCommands ?? []);
    return uniquePaths([...definition.macExecutables ?? [], ...pathResolved]);
  }

  const pathResolved = await resolveCommandOnPath(definition.linuxPathCommands ?? []);
  return uniquePaths([...definition.linuxCandidates ?? [], ...definition.linuxExecutables ?? [], ...pathResolved]);
}

async function getIconDataUrl(filePath: string): Promise<string | null> {
  const iconPathCandidates: string[] = [];
  try {
    const resolvedFilePath = await fsPromises.realpath(filePath).catch(() => filePath);
    iconPathCandidates.push(resolveIdeIconSourcePath(resolvedFilePath));
  } catch {
    iconPathCandidates.push(filePath);
  }

  for (const iconPath of iconPathCandidates) {
    if (process.platform === "darwin" && iconPath.toLowerCase().endsWith(".app")) {
      const bundleIcon = await getMacAppBundleIconDataUrl(iconPath);
      if (bundleIcon) {
        return bundleIcon;
      }
    }

    try {
      const icon = await app.getFileIcon(iconPath, { size: "normal" });
      if (!icon.isEmpty()) {
        return icon.toDataURL();
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function getMacAppBundleIconDataUrl(appBundlePath: string): Promise<string | null> {
  const bundleBaseName = path.basename(appBundlePath, ".app");
  const resourcesPath = path.join(appBundlePath, "Contents", "Resources");

  let resourceEntries: string[];
  try {
    resourceEntries = await fsPromises.readdir(resourcesPath);
  } catch {
    return null;
  }

  const icnsEntries = resourceEntries.filter((entry) => entry.toLowerCase().endsWith(".icns"));
  if (!icnsEntries.length) {
    return null;
  }
  const icnsByLowerName = new Map(icnsEntries.map((entry) => [entry.toLowerCase(), entry]));

  const preferredNames = [
    `${bundleBaseName}.icns`,
    "AppIcon.icns",
    "app.icns",
    "icon.icns"
  ];

  const preferredMatch = preferredNames
    .map((name) => icnsByLowerName.get(name.toLowerCase()) ?? null)
    .find((entry): entry is string => Boolean(entry));
  const fallback = preferredMatch ?? icnsEntries[0];
  const iconPath = path.join(resourcesPath, fallback);
  const icon = nativeImage.createFromPath(iconPath);
  return icon.isEmpty() ? null : icon.toDataURL();
}

async function getIdeIconDataUrl(executablePath: string, definition: IdeDefinition): Promise<string | null> {
  if (process.platform !== "darwin") {
    return getIconDataUrl(executablePath);
  }

  const resolvedExecutablePath = await fsPromises.realpath(executablePath).catch(() => executablePath);
  const directBundlePath = resolveMacAppBundlePath(resolvedExecutablePath);
  if (directBundlePath) {
    return (await getIconDataUrl(directBundlePath)) ?? getIconDataUrl(resolvedExecutablePath);
  }

  const bundleBaseNames = Array.from(new Set(
    [
      definition.name,
      ...((definition.macExecutables ?? [])
        .map((candidate) => getMacAppBundleBaseName(candidate))
        .filter((value): value is string => Boolean(value)))
    ]
  ));

  const fallbackBundlePaths = buildMacAppBundleSearchPaths(bundleBaseNames, os.homedir());
  for (const bundlePath of fallbackBundlePaths) {
    const existing = await toExistingPath(bundlePath);
    if (!existing) {
      continue;
    }

    const iconDataUrl = await getIconDataUrl(existing);
    if (iconDataUrl) {
      return iconDataUrl;
    }
  }

  return getIconDataUrl(resolvedExecutablePath);
}

async function toExistingPath(candidatePath: string): Promise<string | null> {
  try {
    await fsPromises.access(candidatePath);
    return candidatePath;
  } catch {
    return null;
  }
}

export async function getInstalledIdes(): Promise<InstalledIde[]> {
  const detected = await Promise.all(
    IDE_DEFINITIONS.map(async (definition) => {
      const executablePath = (await collectCandidates(definition))[0] ?? null;
      if (!executablePath) {
        return null;
      }

      return {
        id: definition.id,
        name: definition.name,
        executablePath,
        iconDataUrl: await getIdeIconDataUrl(executablePath, definition)
      } satisfies InstalledIde;
    })
  );

  return detected.filter((entry): entry is InstalledIde => entry !== null);
}

function shouldLaunchWithShell(executablePath: string): boolean {
  const extension = path.extname(executablePath).toLowerCase();
  return extension === ".cmd" || extension === ".bat";
}

export async function openProjectInIde(ideId: string, projectPath: string): Promise<void> {
  const normalizedProjectPath = path.resolve(projectPath);
  let projectStats: import("node:fs").Stats;

  try {
    projectStats = await fsPromises.stat(normalizedProjectPath);
  } catch {
    throw new Error("The workspace path no longer exists.");
  }

  if (!projectStats.isDirectory()) {
    throw new Error("The selected workspace path is not a directory.");
  }

  const installedIdes = await getInstalledIdes();
  const targetIde = installedIdes.find((ide) => ide.id === ideId);
  if (!targetIde) {
    throw new Error("That IDE is no longer available on this machine.");
  }

  const child = spawn(targetIde.executablePath, [normalizedProjectPath], {
    cwd: normalizedProjectPath,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    shell: shouldLaunchWithShell(targetIde.executablePath),
    env: buildProcessEnv(process.env)
  });
  child.unref();
}

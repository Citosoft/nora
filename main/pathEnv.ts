import fs from "node:fs";
import path from "node:path";

function isWindowsPlatform(platform: NodeJS.Platform): boolean {
  return platform === "win32";
}

/** Split a PATH-style string using host OS rules so Windows drive letters are not torn apart. */
function splitExecutablePathList(pathStr: string): string[] {
  const trim = (entry: string) => entry.trim();
  if (pathStr.includes(";")) {
    return pathStr.split(";").map(trim).filter(Boolean);
  }
  if (process.platform === "win32" && /^[A-Za-z]:[\\/]/.test(pathStr)) {
    const parts = pathStr.split(/:(?=[A-Za-z]:[\\/])/);
    if (parts.length > 1) {
      return parts.map(trim).filter(Boolean);
    }
    const single = pathStr.trim();
    return single ? [single] : [];
  }
  return pathStr.split(":").map(trim).filter(Boolean);
}

function compareNodeVersionDirsDesc(a: string, b: string): number {
  const aParts = a.replace(/^v/, "").split(".").map((part) => Number(part) || 0);
  const bParts = b.replace(/^v/, "").split(".").map((part) => Number(part) || 0);
  const length = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < length; index += 1) {
    const left = aParts[index] ?? 0;
    const right = bParts[index] ?? 0;
    if (left !== right) {
      return right - left;
    }
  }
  return 0;
}

function getNvmNodeBinCandidates(homeDir: string): string[] {
  if (!homeDir) {
    return [];
  }

  const versionsRoot = path.join(homeDir, ".nvm", "versions", "node");
  if (!fs.existsSync(versionsRoot)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(versionsRoot, { withFileTypes: true });
    const versionDirs = entries
      .filter((entry) => entry.isDirectory() && /^v\d+(?:\.\d+)*$/.test(entry.name))
      .map((entry) => entry.name)
      .sort(compareNodeVersionDirsDesc)
      .slice(0, 3);
    return versionDirs.map((versionDir) => path.join(versionsRoot, versionDir, "bin"));
  } catch {
    return [];
  }
}

function getDarwinPathCandidates(baseEnv: NodeJS.ProcessEnv): string[] {
  const homeDir = baseEnv.HOME || process.env.HOME || "";
  return [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    process.env.NVM_BIN || "",
    baseEnv.NVM_BIN || "",
    process.env.VOLTA_HOME ? path.join(process.env.VOLTA_HOME, "bin") : "",
    baseEnv.VOLTA_HOME ? path.join(baseEnv.VOLTA_HOME, "bin") : "",
    process.env.ASDF_DATA_DIR ? path.join(process.env.ASDF_DATA_DIR, "shims") : "",
    baseEnv.ASDF_DATA_DIR ? path.join(baseEnv.ASDF_DATA_DIR, "shims") : "",
    homeDir ? path.join(homeDir, ".asdf", "shims") : "",
    homeDir ? path.join(homeDir, ".local", "bin") : "",
    homeDir ? path.join(homeDir, "bin") : "",
    ...getNvmNodeBinCandidates(homeDir)
  ]
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildExecutableSearchPath(
  baseEnv: NodeJS.ProcessEnv,
  options?: {
    overridePath?: string;
    platform?: NodeJS.Platform;
  }
): string {
  const platform = options?.platform || process.platform;
  const outputDelimiter = isWindowsPlatform(platform) ? ";" : ":";
  const seedPath = options?.overridePath || baseEnv.PATH || process.env.PATH || "";
  const entries = splitExecutablePathList(seedPath);

  if (platform === "darwin") {
    entries.push(...getDarwinPathCandidates(baseEnv));
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = isWindowsPlatform(platform) ? entry.toLowerCase() : entry;
    if (seen.has(key) || !fs.existsSync(entry)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }

  return deduped.join(outputDelimiter);
}

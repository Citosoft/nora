import type { BrowserCookieProfileSummary, BrowserDataImportResult } from "@shared/appTypes";
import type { Session } from "electron";
import { execFileSync } from "node:child_process";
import { createDecipheriv, createHash, pbkdf2Sync } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  BrowserDataImportDependencies,
  ChromeCookieDecryptionMaterial,
  DecodedCookie,
  RawCookieRow
} from "./types/browserDataImport.types";

const CHROMIUM_EPOCH_OFFSET_SECONDS = 11_644_473_600n;
const PBKDF2_ITERATIONS = 1_003;
const PBKDF2_LINUX_ITERATIONS = 1;
const PBKDF2_KEY_LENGTH = 16;
const PBKDF2_SALT = "saltysalt";
const MACOS_CHROME_KEYCHAIN_SERVICES = [
  "Chrome Safe Storage",
  "Google Chrome Safe Storage",
  "Chromium Safe Storage"
];
const MACOS_CHROME_KEYCHAIN_ACCOUNTS = ["Chrome", "Google Chrome", "Chromium", "Google Chrome Canary"];
const CHROME_NON_PROFILE_DIRECTORY_NAMES = new Set<string>([
  "CertificateRevocation",
  "Crash Reports",
  "Crashpad",
  "GrShaderCache",
  "GraphiteDawnCache",
  "NativeMessagingHosts",
  "OptimizationHints",
  "OriginTrials",
  "PKIMetadata",
  "Safe Browsing",
  "ShaderCache",
  "SingletonCookie",
  "SingletonLock",
  "SingletonSocket",
  "SwReporter",
  "WidevineCdm"
]);

function getPathModuleForPlatform(platform: NodeJS.Platform): typeof path.posix | typeof path.win32 {
  return platform === "win32" ? path.win32 : path.posix;
}

function decodeHexToUtf8(value: string): string {
  if (!value) {
    return "";
  }
  return Buffer.from(value, "hex").toString("utf8");
}

function getChromeUserDataRootPaths(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): string[] {
  const pathModule = getPathModuleForPlatform(platform);

  if (platform === "darwin") {
    const home = env.HOME || "";
    if (!home) {
      return [];
    }
    return [pathModule.join(home, "Library", "Application Support", "Google", "Chrome")];
  }

  if (platform === "linux") {
    const home = env.HOME || "";
    if (!home) {
      return [];
    }
    return [
      pathModule.join(home, ".config", "google-chrome"),
      pathModule.join(home, ".config", "chromium")
    ];
  }

  if (platform === "win32") {
    const localAppDataCandidates = [env.LOCALAPPDATA, env.USERPROFILE ? pathModule.join(env.USERPROFILE, "AppData", "Local") : ""]
      .map((candidate) => candidate || "")
      .filter((candidate, index, allCandidates) => candidate.trim().length > 0 && allCandidates.indexOf(candidate) === index);
    if (!localAppDataCandidates.length) {
      return [];
    }
    const userDataRelativePaths = [
      pathModule.join("Google", "Chrome", "User Data"),
      pathModule.join("Google", "Chrome SxS", "User Data"),
      pathModule.join("Chromium", "User Data")
    ];
    return localAppDataCandidates.flatMap((localAppData) =>
      userDataRelativePaths.map((relativePath) => pathModule.join(localAppData, relativePath))
    );
  }

  return [];
}

function isChromeProfileDirectoryCandidate(profileId: string): boolean {
  if (!profileId.trim()) {
    return false;
  }
  return !CHROME_NON_PROFILE_DIRECTORY_NAMES.has(profileId);
}

function getChromeProfileCookiesPath(
  platform: NodeJS.Platform,
  profileRootPath: string,
  profileId: string,
  fileExists: (candidatePath: string) => boolean
): string | null {
  const pathModule = getPathModuleForPlatform(platform);
  const candidates = [
    pathModule.join(profileRootPath, profileId, "Network", "Cookies"),
    pathModule.join(profileRootPath, profileId, "Cookies")
  ];
  return candidates.find((candidate) => fileExists(candidate)) || null;
}

function getChromeLocalStatePathForRoot(
  platform: NodeJS.Platform,
  profileRootPath: string,
  fileExists: (candidatePath: string) => boolean
): string | null {
  const pathModule = getPathModuleForPlatform(platform);
  const candidate = pathModule.join(profileRootPath, "Local State");
  return fileExists(candidate) ? candidate : null;
}

type ChromeProfileInfoCacheEntry = {
  name?: string;
  gaia_name?: string;
  user_name?: string;
};

type ChromeLocalStateProfiles = {
  profile?: {
    info_cache?: Record<string, ChromeProfileInfoCacheEntry>;
  };
};

function extractChromeProfileDisplayNames(localStateRaw: string): Map<string, string> {
  const profileNamesById = new Map<string, string>();
  try {
    const parsedLocalState = JSON.parse(localStateRaw) as ChromeLocalStateProfiles;
    const infoCache = parsedLocalState.profile?.info_cache;
    if (!infoCache) {
      return profileNamesById;
    }

    for (const [profileId, info] of Object.entries(infoCache)) {
      const candidateDisplayName = info.gaia_name?.trim() || info.user_name?.trim() || info.name?.trim() || "";
      if (!candidateDisplayName) {
        continue;
      }
      profileNamesById.set(profileId, candidateDisplayName);
    }
  } catch {
    return profileNamesById;
  }
  return profileNamesById;
}

export function getChromeCookiesDbPath(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  fileExists: (candidatePath: string) => boolean = existsSync,
  profileId = "Default"
): string | null {
  const rootPaths = getChromeUserDataRootPaths(platform, env);
  for (const rootPath of rootPaths) {
    const profileCookiesPath = getChromeProfileCookiesPath(platform, rootPath, profileId, fileExists);
    if (profileCookiesPath) {
      return profileCookiesPath;
    }
  }
  return null;
}

export function listChromeCookieProfiles(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  dependencies: Partial<BrowserDataImportDependencies> = {}
): BrowserCookieProfileSummary[] {
  const pathModule = getPathModuleForPlatform(platform);
  const fileExists = dependencies.fileExists ?? existsSync;
  const readDirectoryEntries = dependencies.readDirectoryEntries ?? ((targetPath: string) => readdirSync(targetPath));
  const isDirectory = dependencies.isDirectory ?? ((targetPath: string) => statSync(targetPath).isDirectory());
  const readTextFile = dependencies.readTextFile ?? ((targetPath: string) => readFileSync(targetPath, "utf8"));
  const readCookieRowsWithDeps = dependencies.readCookieRows ?? readCookieRows;
  const profiles: BrowserCookieProfileSummary[] = [];
  const rootPaths = getChromeUserDataRootPaths(platform, env);
  const existingRootPaths = rootPaths.filter((rootPath) => fileExists(rootPath));

  for (const rootPath of rootPaths) {
    if (!fileExists(rootPath)) {
      continue;
    }

    let entries: string[] = [];
    try {
      entries = readDirectoryEntries(rootPath);
    } catch {
      continue;
    }

    const profileIds = entries
      .filter((entry) => isChromeProfileDirectoryCandidate(entry))
      .filter((entry) => {
        try {
          return isDirectory(pathModule.join(rootPath, entry));
        } catch {
          return false;
        }
      });
    const localStatePath = getChromeLocalStatePathForRoot(platform, rootPath, fileExists);
    const displayNamesByProfileId = localStatePath
      ? extractChromeProfileDisplayNames(readTextFile(localStatePath))
      : new Map<string, string>();

    for (const profileId of profileIds) {
      const cookiesPath = getChromeProfileCookiesPath(platform, rootPath, profileId, fileExists);
      if (!cookiesPath) {
        continue;
      }

      let rows: RawCookieRow[] = [];
      try {
        rows = readCookieRowsWithDeps(cookiesPath);
      } catch {
        rows = [];
      }

      const totalCookies = rows.length;
      const encryptedCookies = rows.filter((row) => row.encryptedValueHex.length > 0).length;
      const plaintextCookies = rows.filter((row) => row.valueHex.length > 0).length;
      const rootLabel = existingRootPaths.length > 1 ? ` (${pathModule.basename(rootPath)})` : "";
      const displayName = displayNamesByProfileId.get(profileId) || profileId;
      const profileLabelBase = displayName === profileId ? profileId : `${displayName} (${profileId})`;
      profiles.push({
        id: profileId,
        label: `${profileLabelBase}${rootLabel}`,
        totalCookies,
        encryptedCookies,
        plaintextCookies
      });
    }
  }

  return profiles.sort((left, right) => left.label.localeCompare(right.label));
}

function chromiumExpiresUtcToUnixSeconds(expiresUtc: string): number | undefined {
  if (!expiresUtc || expiresUtc === "0") {
    return undefined;
  }

  try {
    const timestamp = BigInt(expiresUtc);
    if (timestamp <= 0n) {
      return undefined;
    }
    const secondsSinceUnixEpoch = timestamp / 1_000_000n - CHROMIUM_EPOCH_OFFSET_SECONDS;
    if (secondsSinceUnixEpoch <= 0n) {
      return undefined;
    }
    return Number(secondsSinceUnixEpoch);
  } catch {
    return undefined;
  }
}

function normalizeSameSite(value: number): "unspecified" | "no_restriction" | "lax" | "strict" {
  if (value === 0) {
    return "no_restriction";
  }
  if (value === 1) {
    return "lax";
  }
  if (value === 2) {
    return "strict";
  }
  return "unspecified";
}

function deriveCookieUrl(domain: string, secure: boolean): string | null {
  const cleanDomain = domain.startsWith(".") ? domain.slice(1) : domain;
  if (!cleanDomain.trim()) {
    return null;
  }

  const protocol = secure ? "https" : "http";
  try {
    return new URL(`${protocol}://${cleanDomain}/`).toString();
  } catch {
    return null;
  }
}

function readMacOsChromeEncryptionKey(): Buffer | null {
  const candidates: string[][] = [];
  for (const service of MACOS_CHROME_KEYCHAIN_SERVICES) {
    candidates.push(["find-generic-password", "-s", service, "-w"]);
    for (const account of MACOS_CHROME_KEYCHAIN_ACCOUNTS) {
      candidates.push(["find-generic-password", "-s", service, "-a", account, "-w"]);
    }
  }

  for (const args of candidates) {
    try {
      const secret = execFileSync("security", args, {
        encoding: "utf8",
        timeout: 30_000
      }).trim();
      if (!secret) {
        continue;
      }
      return pbkdf2Sync(secret, PBKDF2_SALT, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, "sha1");
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

function readLinuxChromeEncryptionKey(): Buffer | null {
  const commands: Array<[string, string[]]> = [
    ["secret-tool", ["lookup", "application", "chrome"]],
    ["secret-tool", ["lookup", "application", "chromium"]]
  ];

  for (const [command, args] of commands) {
    try {
      const secret = execFileSync(command, args, {
        encoding: "utf8",
        timeout: 15_000
      }).trim();
      if (secret) {
        return pbkdf2Sync(secret, PBKDF2_SALT, PBKDF2_LINUX_ITERATIONS, PBKDF2_KEY_LENGTH, "sha1");
      }
    } catch {
      // Continue to next candidate.
    }
  }

  return pbkdf2Sync("peanuts", PBKDF2_SALT, PBKDF2_LINUX_ITERATIONS, PBKDF2_KEY_LENGTH, "sha1");
}

function decryptWindowsDpapiValue(encryptedValue: Buffer): Buffer | null {
  try {
    const inputBase64 = encryptedValue.toString("base64");
    const script = [
      "$ErrorActionPreference='Stop';",
      `$bytes=[Convert]::FromBase64String('${inputBase64}');`,
      "$out=[System.Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);",
      "[Console]::Out.Write([Convert]::ToBase64String($out));"
    ].join(" ");
    const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      timeout: 15_000
    }).trim();
    if (!output) {
      return null;
    }
    return Buffer.from(output, "base64");
  } catch {
    return null;
  }
}

function getChromeLocalStatePath(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  fileExists: (candidatePath: string) => boolean
): string | null {
  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA || "";
    if (!localAppData) {
      return null;
    }
    const candidate = path.join(localAppData, "Google", "Chrome", "User Data", "Local State");
    return fileExists(candidate) ? candidate : null;
  }

  if (platform === "linux") {
    const home = env.HOME || "";
    if (!home) {
      return null;
    }
    const candidates = [
      path.join(home, ".config", "google-chrome", "Local State"),
      path.join(home, ".config", "chromium", "Local State")
    ];
    return candidates.find((candidate) => fileExists(candidate)) || null;
  }

  return null;
}

function extractEncryptedKeyFromLocalState(localStateRaw: string): Buffer | null {
  try {
    const parsed = JSON.parse(localStateRaw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const osCryptCandidate = (parsed as { os_crypt?: unknown }).os_crypt;
    if (!osCryptCandidate || typeof osCryptCandidate !== "object") {
      return null;
    }
    const encryptedKey = (osCryptCandidate as { encrypted_key?: unknown }).encrypted_key;
    if (typeof encryptedKey !== "string" || !encryptedKey.trim()) {
      return null;
    }
    return Buffer.from(encryptedKey, "base64");
  } catch {
    return null;
  }
}

function readWindowsChromeEncryptionKey(
  env: NodeJS.ProcessEnv,
  fileExists: (candidatePath: string) => boolean,
  readTextFile: (targetPath: string) => string
): Buffer | null {
  const localStatePath = getChromeLocalStatePath("win32", env, fileExists);
  if (!localStatePath) {
    return null;
  }

  const encryptedKeyPayload = extractEncryptedKeyFromLocalState(readTextFile(localStatePath));
  if (!encryptedKeyPayload || encryptedKeyPayload.length <= 5) {
    return null;
  }

  const prefix = encryptedKeyPayload.subarray(0, 5).toString("utf8");
  if (prefix !== "DPAPI") {
    return null;
  }

  const dpapiPayload = encryptedKeyPayload.subarray(5);
  const decryptedKey = decryptWindowsDpapiValue(dpapiPayload);
  if (!decryptedKey || decryptedKey.length === 0) {
    return null;
  }

  return decryptedKey;
}

function decryptChromeEncryptedValueCbc(encryptedValue: Buffer, key: Buffer): Buffer | null {
  if (!encryptedValue.length) {
    return Buffer.alloc(0);
  }

  if (encryptedValue.length < 4) {
    return null;
  }
  const version = encryptedValue.subarray(0, 3).toString("utf8");
  if (version !== "v10" && version !== "v11") {
    return null;
  }

  const iv = Buffer.alloc(16, " ");
  const ciphertext = encryptedValue.subarray(3);
  try {
    const decipher = createDecipheriv("aes-128-cbc", key, iv);
    decipher.setAutoPadding(true);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted;
  } catch {
    return null;
  }
}

function decryptChromeEncryptedValueGcm(encryptedValue: Buffer, key: Buffer): Buffer | null {
  if (encryptedValue.length < 3 + 12 + 16) {
    return null;
  }
  const version = encryptedValue.subarray(0, 3).toString("utf8");
  if (version !== "v10" && version !== "v11") {
    return null;
  }

  const nonce = encryptedValue.subarray(3, 15);
  const payload = encryptedValue.subarray(15);
  if (payload.length <= 16) {
    return null;
  }

  const ciphertext = payload.subarray(0, payload.length - 16);
  const authTag = payload.subarray(payload.length - 16);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted;
  } catch {
    return null;
  }
}

function stripChromiumHostBoundValuePrefix(value: Buffer, domain: string): Buffer {
  if (value.length <= 32 || !domain.trim()) {
    return value;
  }
  const hostDigest = createHash("sha256").update(domain, "utf8").digest();
  if (!value.subarray(0, hostDigest.length).equals(hostDigest)) {
    return value;
  }
  return value.subarray(hostDigest.length);
}

export function parseChromeCookieRowsSqliteOutput(output: string): RawCookieRow[] {
  if (!output) {
    return [];
  }

  return output.split("\n").flatMap((line) => {
    const columns = line.split("|");
    if (columns.length !== 9) {
      return [];
    }

    const domain = decodeHexToUtf8(columns[0]);
    const name = decodeHexToUtf8(columns[1]);
    if (!domain || !name) {
      return [];
    }

    const sameSiteValue = Number.parseInt(columns[6] || "", 10);
    return [{
      domain,
      name,
      path: decodeHexToUtf8(columns[2]) || "/",
      secure: columns[3] === "1",
      httpOnly: columns[4] === "1",
      expiresUtc: columns[5] || "0",
      sameSite: Number.isFinite(sameSiteValue) ? sameSiteValue : -1,
      valueHex: columns[7] || "",
      encryptedValueHex: columns[8] || ""
    }];
  });
}

function readCookieRows(cookiesDbPath: string): RawCookieRow[] {
  const query = [
    "SELECT",
    "hex(host_key),",
    "hex(name),",
    "hex(path),",
    "is_secure,",
    "is_httponly,",
    "expires_utc,",
    "samesite,",
    "hex(value),",
    "hex(encrypted_value)",
    "FROM cookies;"
  ].join(" ");
  const output = execFileSync("sqlite3", ["-separator", "|", cookiesDbPath, query], {
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 64 * 1024 * 1024
  }).trim();
  return parseChromeCookieRowsSqliteOutput(output);
}

export function decodeChromeCookie(
  row: RawCookieRow,
  platform: NodeJS.Platform,
  decryptionMaterial: ChromeCookieDecryptionMaterial
): DecodedCookie | null {
  let decodedBytes: Buffer | null = null;
  if (row.encryptedValueHex) {
    const encryptedBuffer = Buffer.from(row.encryptedValueHex, "hex");
    if (platform === "darwin") {
      if (!decryptionMaterial.macOsKey) {
        return null;
      }
      const decrypted = decryptChromeEncryptedValueCbc(encryptedBuffer, decryptionMaterial.macOsKey);
      if (decrypted === null) {
        return null;
      }
      decodedBytes = decrypted;
    } else if (platform === "linux") {
      if (!decryptionMaterial.linuxKey) {
        return null;
      }
      const decrypted = decryptChromeEncryptedValueCbc(encryptedBuffer, decryptionMaterial.linuxKey);
      if (decrypted === null) {
        return null;
      }
      decodedBytes = decrypted;
    } else if (platform === "win32") {
      const withGcmKey = decryptionMaterial.windowsKey
        ? decryptChromeEncryptedValueGcm(encryptedBuffer, decryptionMaterial.windowsKey)
        : null;
      if (withGcmKey !== null) {
        decodedBytes = withGcmKey;
      } else {
        const dpapiDecrypted = decryptionMaterial.decryptWindowsDpapiValue(encryptedBuffer);
        if (!dpapiDecrypted) {
          return null;
        }
        decodedBytes = dpapiDecrypted;
      }
    } else {
      return null;
    }
  } else {
    decodedBytes = Buffer.from(row.valueHex, "hex");
  }

  if (decodedBytes === null) {
    return null;
  }
  const value = stripChromiumHostBoundValuePrefix(decodedBytes, row.domain).toString("latin1");

  return {
    domain: row.domain,
    name: row.name,
    path: row.path || "/",
    secure: row.secure,
    httpOnly: row.httpOnly,
    expirationDate: chromiumExpiresUtcToUnixSeconds(row.expiresUtc),
    sameSite: normalizeSameSite(row.sameSite),
    value
  };
}

export async function importChromeBrowserDataToSession(
  targetSession: Session,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  dependencies: Partial<BrowserDataImportDependencies> = {},
  profileId = "Default"
): Promise<BrowserDataImportResult> {
  const effectiveDependencies: BrowserDataImportDependencies = {
    fileExists: dependencies.fileExists ?? existsSync,
    readDirectoryEntries: dependencies.readDirectoryEntries ?? ((targetPath) => readdirSync(targetPath)),
    isDirectory: dependencies.isDirectory ?? ((targetPath) => statSync(targetPath).isDirectory()),
    readTextFile: dependencies.readTextFile ?? ((targetPath) => readFileSync(targetPath, "utf8")),
    copyFile: dependencies.copyFile ?? copyFileSync,
    createTempDir: dependencies.createTempDir ?? ((prefix) => mkdtempSync(prefix)),
    removeDir: dependencies.removeDir ?? ((targetPath) => rmSync(targetPath, { recursive: true, force: true })),
    readCookieRows: dependencies.readCookieRows ?? readCookieRows,
    readMacOsChromeEncryptionKey: dependencies.readMacOsChromeEncryptionKey ?? readMacOsChromeEncryptionKey,
    readLinuxChromeEncryptionKey: dependencies.readLinuxChromeEncryptionKey ?? readLinuxChromeEncryptionKey,
    readWindowsChromeEncryptionKey: dependencies.readWindowsChromeEncryptionKey ?? readWindowsChromeEncryptionKey,
    decryptWindowsDpapiValue: dependencies.decryptWindowsDpapiValue ?? decryptWindowsDpapiValue
  };

  const sourcePath = getChromeCookiesDbPath(platform, env, effectiveDependencies.fileExists, profileId);
  if (!sourcePath) {
    return {
      ok: false,
      reason: "Could not find a Chrome cookies database on this machine."
    };
  }
  if (!effectiveDependencies.fileExists(sourcePath)) {
    return {
      ok: false,
      reason: "Chrome cookies database was not found. Open Chrome at least once and try again."
    };
  }

  const tempDir = effectiveDependencies.createTempDir(path.join(os.tmpdir(), "nora-chrome-cookie-import-"));
  const tempCookiesDbPath = path.join(tempDir, "Cookies.db");

  try {
    effectiveDependencies.copyFile(sourcePath, tempCookiesDbPath);
  } catch {
    effectiveDependencies.removeDir(tempDir);
    return {
      ok: false,
      reason: "Could not copy Chrome cookies database. Close Chrome and try again."
    };
  }

  try {
    const rows = effectiveDependencies.readCookieRows(tempCookiesDbPath);
    if (!rows.length) {
      return {
        ok: false,
        reason: "No cookies were found in the Chrome profile."
      };
    }

    const decryptionMaterial: ChromeCookieDecryptionMaterial = {
      macOsKey: platform === "darwin" ? effectiveDependencies.readMacOsChromeEncryptionKey() : null,
      linuxKey: platform === "linux" ? effectiveDependencies.readLinuxChromeEncryptionKey() : null,
      windowsKey: platform === "win32"
        ? effectiveDependencies.readWindowsChromeEncryptionKey(env, effectiveDependencies.fileExists, effectiveDependencies.readTextFile)
        : null,
      decryptWindowsDpapiValue: effectiveDependencies.decryptWindowsDpapiValue
    };

    if (platform === "darwin" && !decryptionMaterial.macOsKey) {
      return {
        ok: false,
        reason: "Could not access Chrome encryption keys from macOS Keychain."
      };
    }

    let importedCookies = 0;
    let skippedCookies = 0;
    const importedDomains = new Set<string>();

    for (const row of rows) {
      const decodedCookie = decodeChromeCookie(row, platform, decryptionMaterial);
      if (!decodedCookie) {
        skippedCookies += 1;
        continue;
      }

      const url = deriveCookieUrl(decodedCookie.domain, decodedCookie.secure);
      if (!url) {
        skippedCookies += 1;
        continue;
      }

      try {
        await targetSession.cookies.set({
          url,
          name: decodedCookie.name,
          value: decodedCookie.value,
          domain: decodedCookie.domain,
          path: decodedCookie.path || "/",
          secure: decodedCookie.secure,
          httpOnly: decodedCookie.httpOnly,
          sameSite: decodedCookie.sameSite,
          expirationDate: decodedCookie.expirationDate
        });
        importedCookies += 1;
        importedDomains.add(decodedCookie.domain.replace(/^\./, ""));
      } catch {
        skippedCookies += 1;
      }
    }

    if (importedCookies === 0) {
      if (platform !== "darwin") {
        return {
          ok: false,
          reason: "No importable Chrome cookies were found."
        };
      }
      return {
        ok: false,
        reason: "No importable Chrome cookies were found."
      };
    }

    return {
      ok: true,
      importedCookies,
      skippedCookies,
      domains: Array.from(importedDomains).sort((left, right) => left.localeCompare(right))
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      reason: `Chrome import failed: ${message}`
    };
  } finally {
    effectiveDependencies.removeDir(tempDir);
  }
}

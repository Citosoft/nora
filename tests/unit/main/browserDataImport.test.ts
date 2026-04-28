import {
  decodeChromeCookie,
  getChromeCookiesDbPath,
  importChromeBrowserDataToSession,
  listChromeCookieProfiles,
  parseChromeCookieRowsSqliteOutput
} from "@main/browserDataImport";
import type { ChromeCookieDecryptionMaterial, RawCookieRow } from "@main/types/browserDataImport.types";
import type { Session } from "electron";
import assert from "node:assert/strict";
import { createCipheriv, createHash, pbkdf2Sync } from "node:crypto";
import test from "node:test";

function toHexUtf8(value: string): string {
  return Buffer.from(value, "utf8").toString("hex");
}

function createMockSession(onSet: (details: unknown) => Promise<void>): Session {
  return {
    cookies: {
      set: onSet
    }
  } as unknown as Session;
}

function createDecryptionMaterial(overrides: Partial<ChromeCookieDecryptionMaterial> = {}): ChromeCookieDecryptionMaterial {
  return {
    macOsKey: null,
    linuxKey: null,
    windowsKey: null,
    decryptWindowsDpapiValue: () => null,
    ...overrides
  };
}

test("getChromeCookiesDbPath prefers macOS Network/Cookies path when present", () => {
  const selected = getChromeCookiesDbPath(
    "darwin",
    { HOME: "/Users/tester" },
    (candidatePath) => candidatePath.endsWith("/Default/Network/Cookies")
  );

  assert.equal(selected, "/Users/tester/Library/Application Support/Google/Chrome/Default/Network/Cookies");
});

test("getChromeCookiesDbPath returns null when no cookie DB exists", () => {
  const selected = getChromeCookiesDbPath("darwin", { HOME: "/Users/tester" }, () => false);
  assert.equal(selected, null);
});

test("getChromeCookiesDbPath resolves a non-default profile path when selected", () => {
  const selected = getChromeCookiesDbPath(
    "darwin",
    { HOME: "/Users/tester" },
    (candidatePath) => candidatePath.includes("/Profile 1/Cookies"),
    "Profile 1"
  );
  assert.equal(selected, "/Users/tester/Library/Application Support/Google/Chrome/Profile 1/Cookies");
});

test("listChromeCookieProfiles returns profile summaries", () => {
  const profiles = listChromeCookieProfiles("darwin", { HOME: "/Users/tester" }, {
    fileExists: (candidatePath) =>
      candidatePath === "/Users/tester/Library/Application Support/Google/Chrome"
      || candidatePath.endsWith("/Default/Cookies")
      || candidatePath.endsWith("/Profile 1/Cookies"),
    readDirectoryEntries: () => ["Default", "Profile 1", "Crash Reports"],
    isDirectory: (candidatePath) => candidatePath.endsWith("/Default") || candidatePath.endsWith("/Profile 1"),
    readCookieRows: (cookiesDbPath) => (
      cookiesDbPath.endsWith("/Default/Cookies")
        ? [{
            domain: ".example.com",
            name: "a",
            path: "/",
            secure: true,
            httpOnly: true,
            expiresUtc: "0",
            sameSite: 0,
            valueHex: "",
            encryptedValueHex: "aa"
          }]
        : [{
            domain: ".example.org",
            name: "b",
            path: "/",
            secure: false,
            httpOnly: false,
            expiresUtc: "0",
            sameSite: 1,
            valueHex: "bb",
            encryptedValueHex: ""
          }, {
            domain: ".example.net",
            name: "c",
            path: "/",
            secure: true,
            httpOnly: false,
            expiresUtc: "0",
            sameSite: 2,
            valueHex: "",
            encryptedValueHex: "cc"
          }]
    )
  });

  assert.deepEqual(profiles, [{
    id: "Default",
    label: "Default",
    totalCookies: 1,
    encryptedCookies: 1,
    plaintextCookies: 0
  }, {
    id: "Profile 1",
    label: "Profile 1",
    totalCookies: 2,
    encryptedCookies: 1,
    plaintextCookies: 1
  }]);
});

test("listChromeCookieProfiles includes non-standard profile directory names when they contain cookies", () => {
  const profiles = listChromeCookieProfiles("win32", { LOCALAPPDATA: "C:\\Users\\tester\\AppData\\Local" }, {
    fileExists: (candidatePath) =>
      candidatePath === "C:\\Users\\tester\\AppData\\Local\\Google\\Chrome\\User Data"
      || candidatePath.endsWith("\\Profile 7\\Network\\Cookies")
      || candidatePath.endsWith("\\Work\\Network\\Cookies"),
    readDirectoryEntries: () => ["Default", "Profile 7", "Work", "Crashpad"],
    isDirectory: (candidatePath) =>
      candidatePath.endsWith("\\Default")
      || candidatePath.endsWith("\\Profile 7")
      || candidatePath.endsWith("\\Work")
      || candidatePath.endsWith("\\Crashpad"),
    readCookieRows: (cookiesDbPath) => (
      cookiesDbPath.endsWith("\\Work\\Network\\Cookies")
        ? [{
            domain: ".work.example",
            name: "a",
            path: "/",
            secure: true,
            httpOnly: true,
            expiresUtc: "0",
            sameSite: 0,
            valueHex: "aa",
            encryptedValueHex: ""
          }]
        : []
    )
  });

  assert.deepEqual(profiles, [{
    id: "Profile 7",
    label: "Profile 7",
    totalCookies: 0,
    encryptedCookies: 0,
    plaintextCookies: 0
  }, {
    id: "Work",
    label: "Work",
    totalCookies: 1,
    encryptedCookies: 0,
    plaintextCookies: 1
  }]);
});

test("listChromeCookieProfiles includes profiles even when cookie rows cannot be read", () => {
  const profiles = listChromeCookieProfiles("win32", { LOCALAPPDATA: "C:\\Users\\tester\\AppData\\Local" }, {
    fileExists: (candidatePath) =>
      candidatePath === "C:\\Users\\tester\\AppData\\Local\\Google\\Chrome\\User Data"
      || candidatePath.endsWith("\\Default\\Network\\Cookies"),
    readDirectoryEntries: () => ["Default"],
    isDirectory: (candidatePath) => candidatePath.endsWith("\\Default"),
    readCookieRows: () => {
      throw new Error("sqlite3 not available");
    }
  });

  assert.deepEqual(profiles, [{
    id: "Default",
    label: "Default",
    totalCookies: 0,
    encryptedCookies: 0,
    plaintextCookies: 0
  }]);
});

test("listChromeCookieProfiles prefers profile names from Local State info_cache", () => {
  const profiles = listChromeCookieProfiles("win32", { LOCALAPPDATA: "C:\\Users\\tester\\AppData\\Local" }, {
    fileExists: (candidatePath) =>
      candidatePath === "C:\\Users\\tester\\AppData\\Local\\Google\\Chrome\\User Data"
      || candidatePath.endsWith("\\Default\\Network\\Cookies")
      || candidatePath.endsWith("\\User Data\\Local State"),
    readDirectoryEntries: () => ["Default"],
    isDirectory: (candidatePath) => candidatePath.endsWith("\\Default"),
    readCookieRows: () => [],
    readTextFile: () => JSON.stringify({
      profile: {
        info_cache: {
          Default: {
            gaia_name: "Jane Doe",
            user_name: "jane@example.com",
            name: "Person 1"
          }
        }
      }
    })
  });

  assert.deepEqual(profiles, [{
    id: "Default",
    label: "Jane Doe (Default)",
    totalCookies: 0,
    encryptedCookies: 0,
    plaintextCookies: 0
  }]);
});

test("getChromeCookiesDbPath falls back to USERPROFILE on Windows when LOCALAPPDATA is missing", () => {
  const selected = getChromeCookiesDbPath(
    "win32",
    { USERPROFILE: "C:\\Users\\tester" },
    (candidatePath) => candidatePath.endsWith("\\Default\\Network\\Cookies")
  );

  assert.equal(selected, "C:\\Users\\tester\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Network\\Cookies");
});

test("getChromeCookiesDbPath checks Chromium root on Windows", () => {
  const selected = getChromeCookiesDbPath(
    "win32",
    { LOCALAPPDATA: "C:\\Users\\tester\\AppData\\Local" },
    (candidatePath) => candidatePath.endsWith("\\Chromium\\User Data\\Default\\Network\\Cookies")
  );

  assert.equal(selected, "C:\\Users\\tester\\AppData\\Local\\Chromium\\User Data\\Default\\Network\\Cookies");
});

test("parseChromeCookieRowsSqliteOutput parses a cookie row", () => {
  const line = [
    toHexUtf8(".example.com"),
    toHexUtf8("session"),
    toHexUtf8("/"),
    "1",
    "0",
    "13217451524000000",
    "1",
    toHexUtf8("abc123"),
    ""
  ].join("|");

  const rows = parseChromeCookieRowsSqliteOutput(line);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    domain: ".example.com",
    name: "session",
    path: "/",
    secure: true,
    httpOnly: false,
    expiresUtc: "13217451524000000",
    sameSite: 1,
    valueHex: toHexUtf8("abc123"),
    encryptedValueHex: ""
  });
});

test("decodeChromeCookie decodes plaintext cookie values", () => {
  const cookie = decodeChromeCookie({
    domain: ".example.com",
    name: "plain",
    path: "/",
    secure: false,
    httpOnly: true,
    expiresUtc: "0",
    sameSite: 2,
    valueHex: Buffer.from([0x63, 0x61, 0x66, 0xe9]).toString("hex"),
    encryptedValueHex: ""
  }, "linux", createDecryptionMaterial());

  assert.ok(cookie);
  assert.equal(cookie.value, "caf\xe9");
  assert.equal(cookie.sameSite, "strict");
  assert.equal(cookie.expirationDate, undefined);
});

test("decodeChromeCookie decrypts Linux encrypted cookies with provided key", () => {
  const linuxKey = pbkdf2Sync("peanuts", "saltysalt", 1, 16, "sha1");
  const iv = Buffer.alloc(16, " ");
  const cipher = createCipheriv("aes-128-cbc", linuxKey, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from("linux-cookie", "utf8")), cipher.final()]);
  const encryptedBuffer = Buffer.concat([Buffer.from("v10", "utf8"), ciphertext]);

  const cookie = decodeChromeCookie({
    domain: ".example.com",
    name: "secure-cookie",
    path: "/",
    secure: true,
    httpOnly: true,
    expiresUtc: "0",
    sameSite: 0,
    valueHex: "",
    encryptedValueHex: encryptedBuffer.toString("hex")
  }, "linux", createDecryptionMaterial({ linuxKey }));

  assert.ok(cookie);
  assert.equal(cookie.value, "linux-cookie");
});

test("decodeChromeCookie strips Chromium host-bound prefix when present", () => {
  const linuxKey = pbkdf2Sync("peanuts", "saltysalt", 1, 16, "sha1");
  const domain = ".example.com";
  const hostDigest = createHash("sha256").update(domain, "utf8").digest();
  const decryptedValue = Buffer.concat([hostDigest, Buffer.from("linux-cookie", "utf8")]);
  const iv = Buffer.alloc(16, " ");
  const cipher = createCipheriv("aes-128-cbc", linuxKey, iv);
  const ciphertext = Buffer.concat([cipher.update(decryptedValue), cipher.final()]);
  const encryptedBuffer = Buffer.concat([Buffer.from("v10", "utf8"), ciphertext]);

  const cookie = decodeChromeCookie({
    domain,
    name: "secure-cookie",
    path: "/",
    secure: true,
    httpOnly: true,
    expiresUtc: "0",
    sameSite: 0,
    valueHex: "",
    encryptedValueHex: encryptedBuffer.toString("hex")
  }, "linux", createDecryptionMaterial({ linuxKey }));

  assert.ok(cookie);
  assert.equal(cookie.value, "linux-cookie");
});

test("decodeChromeCookie decrypts Windows AES-GCM encrypted cookies with provided key", () => {
  const windowsKey = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");
  const nonce = Buffer.from("123456789012", "utf8");
  const cipher = createCipheriv("aes-256-gcm", windowsKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from("win-cookie", "utf8")), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encryptedBuffer = Buffer.concat([
    Buffer.from("v10", "utf8"),
    nonce,
    ciphertext,
    authTag
  ]);

  const cookie = decodeChromeCookie({
    domain: ".example.com",
    name: "secure-cookie",
    path: "/",
    secure: true,
    httpOnly: true,
    expiresUtc: "0",
    sameSite: 0,
    valueHex: "",
    encryptedValueHex: encryptedBuffer.toString("hex")
  }, "win32", createDecryptionMaterial({ windowsKey }));

  assert.ok(cookie);
  assert.equal(cookie.value, "win-cookie");
});

test("decodeChromeCookie skips encrypted cookies when no decryption material is available", () => {
  const cookie = decodeChromeCookie({
    domain: ".example.com",
    name: "secure-cookie",
    path: "/",
    secure: true,
    httpOnly: true,
    expiresUtc: "0",
    sameSite: 0,
    valueHex: "",
    encryptedValueHex: Buffer.from("v10encrypted", "utf8").toString("hex")
  }, "linux", createDecryptionMaterial());

  assert.equal(cookie, null);
});

test("importChromeBrowserDataToSession imports plaintext cookies into the browser session", async () => {
  const cookieRows: RawCookieRow[] = [{
    domain: ".example.com",
    name: "token",
    path: "/",
    secure: true,
    httpOnly: true,
    expiresUtc: "0",
    sameSite: 0,
    valueHex: toHexUtf8("hello"),
    encryptedValueHex: ""
  }];

  const cookieSetCalls: unknown[] = [];
  const session = createMockSession(async (details) => {
    cookieSetCalls.push(details);
  });

  const result = await importChromeBrowserDataToSession(
    session,
    "linux",
    { HOME: "/home/tester" },
    {
      fileExists: () => true,
      copyFile: () => undefined,
      createTempDir: () => "/tmp/nora-cookie-import-test",
      removeDir: () => undefined,
      readCookieRows: () => cookieRows,
      readMacOsChromeEncryptionKey: () => null,
      readLinuxChromeEncryptionKey: () => null,
      readWindowsChromeEncryptionKey: () => null,
      decryptWindowsDpapiValue: () => null
    }
  );

  assert.deepEqual(result, {
    ok: true,
    importedCookies: 1,
    skippedCookies: 0,
    domains: ["example.com"]
  });
  assert.equal(cookieSetCalls.length, 1);
});

test("importChromeBrowserDataToSession returns no-importable-cookies message when all linux cookies fail decryption", async () => {
  const cookieRows: RawCookieRow[] = [{
    domain: ".example.com",
    name: "token",
    path: "/",
    secure: true,
    httpOnly: true,
    expiresUtc: "0",
    sameSite: 0,
    valueHex: "",
    encryptedValueHex: Buffer.from("v10encrypted", "utf8").toString("hex")
  }];

  const session = createMockSession(async () => undefined);
  const result = await importChromeBrowserDataToSession(
    session,
    "linux",
    { HOME: "/home/tester" },
    {
      fileExists: () => true,
      copyFile: () => undefined,
      createTempDir: () => "/tmp/nora-cookie-import-test",
      removeDir: () => undefined,
      readCookieRows: () => cookieRows,
      readMacOsChromeEncryptionKey: () => null,
      readLinuxChromeEncryptionKey: () => null,
      readWindowsChromeEncryptionKey: () => null,
      decryptWindowsDpapiValue: () => null
    }
  );

  assert.deepEqual(result, {
    ok: false,
    reason: "No importable Chrome cookies were found."
  });
});

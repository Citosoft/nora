export type RawCookieRow = {
  domain: string;
  name: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expiresUtc: string;
  sameSite: number;
  valueHex: string;
  encryptedValueHex: string;
};

export type DecodedCookie = {
  domain: string;
  name: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expirationDate?: number;
  sameSite: "unspecified" | "no_restriction" | "lax" | "strict";
  value: string;
};

export type BrowserDataImportDependencies = {
  fileExists: (candidatePath: string) => boolean;
  readDirectoryEntries: (targetPath: string) => string[];
  isDirectory: (targetPath: string) => boolean;
  readTextFile: (targetPath: string) => string;
  copyFile: (fromPath: string, toPath: string) => void;
  createTempDir: (prefix: string) => string;
  removeDir: (targetPath: string) => void;
  readCookieRows: (cookiesDbPath: string) => RawCookieRow[];
  readMacOsChromeEncryptionKey: () => Buffer | null;
  readLinuxChromeEncryptionKey: () => Buffer | null;
  readWindowsChromeEncryptionKey: (env: NodeJS.ProcessEnv, fileExists: (candidatePath: string) => boolean, readTextFile: (targetPath: string) => string) => Buffer | null;
  decryptWindowsDpapiValue: (encryptedValue: Buffer) => Buffer | null;
};

export type ChromeCookieDecryptionMaterial = {
  macOsKey: Buffer | null;
  linuxKey: Buffer | null;
  windowsKey: Buffer | null;
  decryptWindowsDpapiValue: (encryptedValue: Buffer) => Buffer | null;
};

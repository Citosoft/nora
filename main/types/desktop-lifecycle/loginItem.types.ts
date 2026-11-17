/** The Electron login-item API surface, so the adaptor can be exercised without Electron. */
export interface LoginItemApp {
  isPackaged: boolean;
  setLoginItemSettings(settings: { openAtLogin: boolean; path?: string; args?: string[] }): void;
  getLoginItemSettings(): { wasOpenedAtLogin?: boolean };
}

export interface LoginItemFileSystem {
  mkdir(directory: string): Promise<void>;
  writeFile(filePath: string, content: string): Promise<void>;
  /** Removes the file; a missing file is not an error. */
  removeFile(filePath: string): Promise<void>;
}

export interface LoginItemAdapterDeps {
  platform: NodeJS.Platform;
  app: LoginItemApp;
  fs: LoginItemFileSystem;
  env: NodeJS.ProcessEnv;
  homeDirectory: string;
  /** `process.execPath` of the running app. */
  execPath: string;
  /** `process.argv` of the running app. */
  argv: readonly string[];
  log(message: string, error?: unknown): void;
}

/** Where the Windows login item points and what it passes, for Squirrel-installed builds. */
export interface WindowsLoginItemSettings {
  openAtLogin: boolean;
  path: string;
  args: string[];
}

import type { AccountSession } from "@main/types/account/session.types";
import type { BrowserWindow, IpcMainInvokeEvent } from "electron";
import type { AccountAction, AccountConfig, AccountState } from "@shared/types/account/account.types";
import type { SettingsCloudClient } from "@main/types/settings-sync/client.types";

export interface AccountRuntimeOptions {
  rendererDirectory: string;
  configPath: string;
  mainWindow(): BrowserWindow | null;
  onSessionChanged(): void;
  /** Documents served on other hosts of the app scheme, such as MCP widget frames; null when a URL is not theirs. */
  hostedFrames?(url: URL): Response | null;
}

export interface AccountRuntime {
  initialize(): void;
  load(window: BrowserWindow): Promise<void>;
  open(action: AccountAction): void;
  state(): AccountState;
  config(): AccountConfig;
  publish(state: AccountState, sessionId?: string | null): void;
  session(): AccountSession | null;
  sessionToken(expected: AccountSession, signal: AbortSignal): Promise<string>;
  cloud: SettingsCloudClient;
  isAccountSender(event: IpcMainInvokeEvent): boolean;
  dispose(): void;
}

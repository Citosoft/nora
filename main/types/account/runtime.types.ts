import type { BrowserWindow, IpcMainInvokeEvent } from "electron";
import type { AccountAction, AccountConfig, AccountState } from "@shared/types/account/account.types";
import type { SettingsCloudClient, SyncSession } from "@main/types/settings-sync/client.types";

export interface AccountRuntimeOptions {
  rendererDirectory: string;
  configPath: string;
  mainWindow(): BrowserWindow | null;
  onSessionChanged(): void;
}

export interface AccountRuntime {
  initialize(): void;
  load(window: BrowserWindow): Promise<void>;
  open(action: AccountAction): void;
  state(): AccountState;
  config(): AccountConfig;
  publish(state: AccountState, sessionId?: string | null): void;
  session(): SyncSession | null;
  cloud: SettingsCloudClient;
  isAccountSender(event: IpcMainInvokeEvent): boolean;
  dispose(): void;
}

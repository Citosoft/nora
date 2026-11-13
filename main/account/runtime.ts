import { createClerkBridge } from "@clerk/electron";
import { storage } from "@clerk/electron/storage";
import { app, protocol, shell } from "electron";
import { ACCOUNT_CHANNELS } from "@shared/account/contracts";
import type { AccountState } from "@shared/types/account/account.types";
import type { AccountRuntime, AccountRuntimeOptions } from "@main/types/account/runtime.types";
import { clerkFrontendHost, readAccountConfig } from "./config";
import { ACCOUNT_ORIGIN, ACCOUNT_SCHEME } from "./assets";
import { registerAccountProtocol } from "./protocol";
import { restoreStorage } from "./restoreStorage";
import { createClerkSyncClient } from "@main/settings-sync/clerkClient";
import type { SyncSession } from "@main/types/settings-sync/client.types";

/** Clerk keeps tokens in main; its dialogs render inside the trusted workspace window. */
export function createAccountRuntime(options: AccountRuntimeOptions): AccountRuntime {
  const config = readAccountConfig(options.configPath);
  const host = clerkFrontendHost(config.publishableKey);
  let state: AccountState = !config.publishableKey ? { status: "unconfigured" }
    : host ? { status: "loading" } : { status: "error", message: "Account sign-in is unavailable." };
  let migration: Promise<void> | null = null;
  let activeSession: SyncSession | null = null;
  const tokens = storage({ name: "nora-account-tokens" });
  const cloud = createClerkSyncClient({ host: host ?? "", tokens, fetch, session: () => activeSession });
  const clerk = host && app.hasSingleInstanceLock() ? createClerkBridge({ storage: tokens,
    renderer: { scheme: ACCOUNT_SCHEME, host: "renderer" }, manageSingleInstanceLock: false,
    userAgent: `Nora/${app.getVersion()}` }) : null;
  if (!clerk) protocol.registerSchemesAsPrivileged([{ scheme: ACCOUNT_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
  return {
    initialize() { registerAccountProtocol(options.rendererDirectory, host); },
    async load(window) {
      window.webContents.on("will-navigate", (event) => event.preventDefault());
      window.webContents.on("will-redirect", (event) => { if (event.isMainFrame) event.preventDefault(); });
      window.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://")) void shell.openExternal(url);
        return { action: "deny" };
      });
      migration ??= restoreStorage(options.rendererDirectory).catch((error: unknown) => { migration = null; throw error; });
      await migration;
      if (!window.isDestroyed()) await window.loadURL(`${ACCOUNT_ORIGIN}/`);
    },
    open(action) {
      if (!host) throw new Error("Account sign-in is unavailable.");
      const window = options.mainWindow();
      if (window && !window.isDestroyed()) window.webContents.send(ACCOUNT_CHANNELS.open, action);
    },
    state: () => state, config: () => ({ publishableKey: host ? config.publishableKey : "" }),
    cloud, session: () => activeSession,
    publish(next, sessionId) {
      const before = activeSession;
      if (next.status === "signed-in" && sessionId) activeSession = { userId: next.user.id, sessionId };
      else if (next.status === "signed-out" || next.status === "unconfigured" || (next.status === "signed-in" && activeSession?.userId !== next.user.id)) activeSession = null;
      state = next;
      if (before?.userId !== activeSession?.userId || before?.sessionId !== activeSession?.sessionId) options.onSessionChanged();
      const window = options.mainWindow();
      if (window && !window.isDestroyed()) window.webContents.send(ACCOUNT_CHANNELS.changed, state);
    },
    isAccountSender(event) {
      const window = options.mainWindow();
      return !!window && !window.isDestroyed() && event.sender.id === window.webContents.id
        && event.senderFrame === window.webContents.mainFrame && event.senderFrame.url.startsWith(`${ACCOUNT_ORIGIN}/`);
    },
    dispose() { clerk?.cleanup(); }
  };
}

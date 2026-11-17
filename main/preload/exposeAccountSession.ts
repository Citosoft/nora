import { contextBridge, ipcRenderer } from "electron";
import { exposeClerkBridge } from "@clerk/electron/preload";
import { ACCOUNT_CHANNELS, accountConfigSchema, accountReportSchema } from "@shared/account/contracts";
import type { AccountSessionBridge } from "@shared/types/account/account.types";

export function exposeAccountSession(): void {
  exposeClerkBridge();
  const account: AccountSessionBridge = {
    async config() { return accountConfigSchema.parse(await ipcRenderer.invoke(ACCOUNT_CHANNELS.config)); },
    async publish(state, sessionId) { await ipcRenderer.invoke(ACCOUNT_CHANNELS.publish, accountReportSchema.parse({ state, sessionId })); }
  };
  contextBridge.exposeInMainWorld("noraAccount", account);
}

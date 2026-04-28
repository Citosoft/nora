import { ipcRenderer } from "electron";

// Keep the Electron invoke boundary in one helper so preload bridge modules stay declarative.
export function invokeIpc(channel: string, ...args: readonly unknown[]) {
  return ipcRenderer.invoke(channel, ...args);
}

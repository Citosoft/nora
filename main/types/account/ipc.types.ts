import type { IpcMain, IpcMainInvokeEvent } from "electron";
import type { AccountRuntime } from "./runtime.types";

export interface AccountIpcDeps {
  ipc: Pick<IpcMain, "handle" | "removeHandler">;
  runtime: AccountRuntime;
  isAllowedSender(event: IpcMainInvokeEvent): boolean;
}

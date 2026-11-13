import type { IpcMain, IpcMainInvokeEvent } from "electron";
import type { SettingsSyncService } from "./service.types";

export interface SyncIpcDeps {
  ipc: Pick<IpcMain, "handle" | "removeHandler">;
  service: SettingsSyncService;
  isAllowedSender(event: IpcMainInvokeEvent): boolean;
}

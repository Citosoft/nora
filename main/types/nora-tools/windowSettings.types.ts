import type { IpcMain, IpcMainInvokeEvent } from "electron";
import type { WindowSettings, WindowSettingsPort, WindowSettingsRequest, WindowSettingsReply } from "@shared/types/nora-tools/settings.types";

export interface PendingWindowSettings {
  resolve(settings: WindowSettings): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}
export interface WindowSettingsPortOptions {
  send(request: WindowSettingsRequest): void;
  timeoutMs?: number;
}
export interface MainWindowSettingsPort extends WindowSettingsPort {
  receive(reply: WindowSettingsReply): void;
}
export interface WindowSettingsIpcDeps {
  ipc: Pick<IpcMain, "handle">;
  port: MainWindowSettingsPort;
  isAllowedSender(event: IpcMainInvokeEvent): boolean;
}

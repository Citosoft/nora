import type { AppUpdateStatus } from "./appAbout.types";
import type { ReactNode } from "react";

export type UpdatePhase = "downloading" | "restarting";
export type UpdateAction = { kind: "idle" } | { kind: "downloading" } | { kind: "restarting" } | { kind: "error"; phase: UpdatePhase };
export interface AppUpdatePort {
  download(): Promise<boolean>;
  reload(): Promise<void>;
}
export interface AppUpdateSnapshot {
  enabled: boolean;
  key: string | null;
  available: boolean;
  pending: boolean;
  downloading: boolean;
  progress: number | undefined;
}
export type UpdateScreenState =
  | { kind: "available"; downloaded: boolean }
  | { kind: "downloading"; progress: number | null; installing: boolean }
  | { kind: "restarting" }
  | { kind: "error"; phase: UpdatePhase };
export interface AppUpdateController {
  screen: UpdateScreenState | null;
  status: AppUpdateStatus;
  install(): void;
  dismiss(): void;
}
export interface AppUpdateBoundaryProps { children: ReactNode; }
export interface AppUpdateScreenProps {
  state: UpdateScreenState;
  onInstall(): void;
  onDismiss(): void;
}

export interface UpdateScreenCopy { title: string; message: string; actionLabel: string; dismissible: boolean; }

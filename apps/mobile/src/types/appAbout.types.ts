export interface InstalledAppInfo {
  version: string | null;
  build: string | null;
  applicationId: string | null;
}
export interface NativeAppAbout extends InstalledAppInfo {
  kind: "native";
  source: "development" | "embedded" | "ota" | "recovery";
  updatesEnabled: boolean;
  channel: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  publishedAt: Date | null;
  lastCheckedAt: Date | null;
  checking: boolean;
  downloading: boolean;
  available: boolean;
  pending: boolean;
  nextUpdateId: string | null;
  checkFailed: boolean;
  downloadFailed: boolean;
}
export type AppAboutInfo = NativeAppAbout | { kind: "web"; version: string | null };
export interface AppUpdateStatus {
  info: AppAboutInfo;
  check(): void;
}
export interface AppInfoRow { label: string; value: string; }
export interface AppInfoSection { title: string; rows: readonly AppInfoRow[]; footer?: string; }
export interface AboutInfoRowProps { row: AppInfoRow; }

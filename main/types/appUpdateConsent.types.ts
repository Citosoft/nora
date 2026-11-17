import type { AutoUpdateStatus, ReleaseVersionStatus } from "@shared/appTypes";

export interface AppUpdateConsentDeps {
  getStatus(): AutoUpdateStatus;
  setStatus(status: AutoUpdateStatus): void;
  checkRelease(): Promise<ReleaseVersionStatus>;
  startDownload(): void;
}

import type { AutoUpdateStatus, LinuxUpdateStatus } from "@shared/appTypes";

export type AppMainChromeTopBannersProps = {
  autoUpdateStatus: AutoUpdateStatus | null;
  isInstallingDownloadedUpdate: boolean;
  onInstallDownloadedUpdate: () => void;
  linuxUpdateStatus: Extract<LinuxUpdateStatus, { kind: "available" }> | null;
  onCopyLinuxUpdateCommand: () => void;
  onOpenLinuxRelease: () => void;
  onDismissLinuxUpdate: () => void;
};

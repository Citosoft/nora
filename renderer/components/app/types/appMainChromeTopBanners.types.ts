import type { LinuxUpdateStatus } from "@shared/appTypes";

export type AppMainChromeTopBannersProps = {
  linuxUpdateStatus: Extract<LinuxUpdateStatus, { kind: "available" }> | null;
  onCopyLinuxUpdateCommand: () => void;
  onOpenLinuxRelease: () => void;
  onDismissLinuxUpdate: () => void;
};

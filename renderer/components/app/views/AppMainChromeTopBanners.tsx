import { LinuxUpdateBanner as AppLinuxUpdateBanner } from "@/components/app/chrome/LinuxUpdateBanner";
import type { AppMainChromeTopBannersProps } from "@/components/app/types/appMainChromeTopBanners.types";

export const AppMainChromeTopBanners = ({
  linuxUpdateStatus,
  onCopyLinuxUpdateCommand,
  onOpenLinuxRelease,
  onDismissLinuxUpdate
}: AppMainChromeTopBannersProps) =>
  linuxUpdateStatus ? (
    <AppLinuxUpdateBanner
      status={linuxUpdateStatus}
      onCopyCommand={onCopyLinuxUpdateCommand}
      onOpenRelease={onOpenLinuxRelease}
      onDismiss={onDismissLinuxUpdate}
    />
  ) : null;

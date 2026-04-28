import { AutoUpdateBanner as AppAutoUpdateBanner } from "@/components/app/chrome/AutoUpdateBanner";
import { LinuxUpdateBanner as AppLinuxUpdateBanner } from "@/components/app/chrome/LinuxUpdateBanner";
import type { AppMainChromeTopBannersProps } from "@/components/app/types/appMainChromeTopBanners.types";

export const AppMainChromeTopBanners = ({
  autoUpdateStatus,
  isInstallingDownloadedUpdate,
  onInstallDownloadedUpdate,
  linuxUpdateStatus,
  onCopyLinuxUpdateCommand,
  onOpenLinuxRelease,
  onDismissLinuxUpdate
}: AppMainChromeTopBannersProps) => (
  <>
    {autoUpdateStatus?.kind === "downloaded" ||
    autoUpdateStatus?.kind === "downloading" ||
    autoUpdateStatus?.kind === "installing" ? (
      <AppAutoUpdateBanner
        status={autoUpdateStatus}
        isInstalling={isInstallingDownloadedUpdate}
        onInstall={onInstallDownloadedUpdate}
      />
    ) : null}
    {linuxUpdateStatus ? (
      <AppLinuxUpdateBanner
        status={linuxUpdateStatus}
        onCopyCommand={onCopyLinuxUpdateCommand}
        onOpenRelease={onOpenLinuxRelease}
        onDismiss={onDismissLinuxUpdate}
      />
    ) : null}
  </>
);

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { MOBILE_APP_DOWNLOADS } from "@/components/app/constants/mobileAppDownloads";
import { QrCode } from "@/components/app/shared/QrCode";
import { SettingsCardRow } from "./settingsUi";

/** One row per phone app download, each with a small QR code to scan from the phone and a button to open it here. */
export function MobileAppInstallRows({ onError }: { onError(message: string): void }) {
  return <>{MOBILE_APP_DOWNLOADS.map((download) => <SettingsCardRow key={download.platform} title={download.label}
    description={`${download.channel}. Scan with your phone's camera to install.`}
    control={<>
      <Button variant="outline" size="sm" onClick={() => { void noraSystemClient.openExternalUrl(download.url).catch(() => onError("The download link could not open.")); }}>
        <ExternalLink className="size-3.5" aria-hidden="true" />Open
      </Button>
      <QrCode value={download.url} label={`QR code: ${download.label}`} className="size-20" />
    </>} />)}</>;
}

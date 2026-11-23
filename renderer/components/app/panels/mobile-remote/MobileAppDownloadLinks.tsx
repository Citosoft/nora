import { useState } from "react";
import { Download } from "lucide-react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { MOBILE_APP_DOWNLOADS } from "@/components/app/constants/mobileAppDownloads";
import { Button } from "@/components/ui/button";

/** Buttons that open where to install the phone app, in the system browser. */
export function MobileAppDownloadLinks() {
  const [error, setError] = useState<string | null>(null);
  return <div className="space-y-1">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {MOBILE_APP_DOWNLOADS.map((download) => <span key={download.platform} className="inline-flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { setError(null); void noraSystemClient.openExternalUrl(download.url).catch(() => setError("The download link could not open.")); }}>
          <Download className="size-3.5" aria-hidden="true" />{download.label}</Button>
        <span className="text-xs text-muted-foreground">{download.channel}</span>
      </span>)}
    </div>
    {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
  </div>;
}

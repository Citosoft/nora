import type { AboutUpdateBannerProps } from "@/components/app/types/aboutDialog.types";
import { Button } from "@/components/ui/button";
import { APP_SHORT_NAME } from "@shared/appMeta";
import { Download, TerminalSquare } from "lucide-react";

export function AboutUpdateBanner({
  summary,
  onDownload,
  onSelfUpdate,
  isStartingSelfUpdate,
  selfUpdateError
}: AboutUpdateBannerProps) {
  return (
    <section className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div>
        <div className="text-sm font-medium text-foreground">
          {APP_SHORT_NAME} {summary.latestVersion} is available
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Download the installer, or run the self-updater in a local terminal.
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onDownload}>
          <Download className="size-3.5" aria-hidden="true" />
          Download
        </Button>
        <Button size="sm" className="flex-1" disabled={isStartingSelfUpdate} onClick={onSelfUpdate}>
          <TerminalSquare className="size-3.5" aria-hidden="true" />
          {isStartingSelfUpdate ? "Starting terminal…" : "Self update"}
        </Button>
      </div>
      {selfUpdateError ? <div className="text-xs text-destructive">{selfUpdateError}</div> : null}
    </section>
  );
}

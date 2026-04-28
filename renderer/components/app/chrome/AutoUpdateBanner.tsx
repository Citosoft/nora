import { Button } from "@/components/ui/button";
import type { AutoUpdateStatus } from "@shared/appTypes";
import { Download, LoaderCircle, RefreshCw } from "lucide-react";

export function AutoUpdateBanner({
  status,
  isInstalling,
  onInstall
}: {
  status: Extract<AutoUpdateStatus, { kind: "downloaded" | "downloading" | "installing" }>;
  isInstalling: boolean;
  onInstall: () => void;
}) {
  const latestVersionLabel = status.latestVersion ? `Nora ${status.latestVersion}` : "A new Nora update";

  return (
    <div className="border-b border-border/60 bg-primary/6 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {status.kind === "downloaded" ? (
              <Download className="size-4 text-primary" />
            ) : (
              <LoaderCircle className="size-4 animate-spin text-primary" />
            )}
            {status.kind === "downloaded"
              ? "Update ready to install"
              : status.kind === "installing"
                ? "Installing update"
                : "Downloading update"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {status.kind === "downloaded"
              ? `${latestVersionLabel} has been downloaded and is ready to install.`
              : status.kind === "installing"
                ? `${latestVersionLabel} is being installed. Nora will restart when the install completes.`
                : `${latestVersionLabel} is downloading in the background.`}
          </div>
        </div>
        {status.kind === "downloaded" ? (
          <Button onClick={onInstall} disabled={isInstalling}>
            {isInstalling ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Restart to install
          </Button>
        ) : null}
      </div>
    </div>
  );
}

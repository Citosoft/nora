import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { AboutHero } from "@/components/app/dialogs/about/AboutHero";
import { AboutLinks } from "@/components/app/dialogs/about/AboutLinks";
import { AboutUpdateBanner } from "@/components/app/dialogs/about/AboutUpdateBanner";
import { ReleaseAssetDialog } from "@/components/app/dialogs/about/ReleaseAssetDialog";
import { ThirdPartyNoticesDialog } from "@/components/app/dialogs/about/ThirdPartyNoticesDialog";
import { UpdateTestingPanel } from "@/components/app/dialogs/about/UpdateTestingPanel";
import { useAboutUpdateStatus } from "@/components/app/hooks/useAboutUpdateStatus";
import { useReleaseAssetDownload } from "@/components/app/hooks/useReleaseAssetDownload";
import { useRepositoryStar } from "@/components/app/hooks/useRepositoryStar";
import { useThirdPartyNotices } from "@/components/app/hooks/useThirdPartyNotices";
import { summarizeAboutUpdateStatus } from "@/components/app/logic/aboutDialogStatus";
import type { AboutDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { APP_COMPANY_NAME, APP_VERSION } from "@shared/appMeta";
import { useState } from "react";

export function AboutDialog({ open, onOpenChange, focusLocalTerminalDock }: AboutDialogProps) {
  const updateStatus = useAboutUpdateStatus(open);
  const repositoryStar = useRepositoryStar(open);
  const thirdPartyNotices = useThirdPartyNotices();
  const releaseAssets = useReleaseAssetDownload();
  const [isStartingSelfUpdate, setIsStartingSelfUpdate] = useState(false);
  const [selfUpdateError, setSelfUpdateError] = useState<string | null>(null);

  const summary = summarizeAboutUpdateStatus(updateStatus.status, updateStatus.hasChecked, APP_VERSION);
  const close = (): void => onOpenChange(false);

  const runSelfUpdate = (): void => {
    setIsStartingSelfUpdate(true);
    setSelfUpdateError(null);
    void noraSystemClient.runReleaseInstallerInLocalTerminal()
      .then(async () => {
        close();
        await focusLocalTerminalDock();
      })
      .catch((error: unknown) => {
        setSelfUpdateError(error instanceof Error ? error.message : "Unable to run the installer in the local terminal.");
      })
      .finally(() => {
        setIsStartingSelfUpdate(false);
      });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onClose={close} className="max-w-[460px]">
          <AboutHero summary={summary} />
          <DialogBody className="space-y-4">
            {summary.canUpdate ? (
              <AboutUpdateBanner
                summary={summary}
                onDownload={releaseAssets.show}
                onSelfUpdate={runSelfUpdate}
                isStartingSelfUpdate={isStartingSelfUpdate}
                selfUpdateError={selfUpdateError}
              />
            ) : null}
            <AboutLinks repositoryStar={repositoryStar} onShowThirdPartyNotices={thirdPartyNotices.show} />
            {updateStatus.autoUpdateTestingEnabled ? <UpdateTestingPanel /> : null}
          </DialogBody>
          <DialogFooter>
            <span className="mr-auto text-xs text-muted-foreground">
              © {APP_COMPANY_NAME}. All rights reserved.
            </span>
            <Button variant="outline" onClick={close}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ThirdPartyNoticesDialog notices={thirdPartyNotices} />
      <ReleaseAssetDialog releaseAssets={releaseAssets} />
    </>
  );
}

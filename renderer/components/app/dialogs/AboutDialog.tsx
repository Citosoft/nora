import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { AppMark } from "@/components/app/shared/AppMark";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { AboutDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, APP_VERSION } from "@shared/appMeta";
import type { AutoUpdateTestTarget, ReleaseVersionStatus } from "@shared/appTypes";
import { useEffect, useState } from "react";

const AUTO_UPDATE_TEST_ACTIONS: Array<{ target: AutoUpdateTestTarget; label: string }> = [
  { target: "checking", label: "Checking" },
  { target: "downloading", label: "Downloading" },
  { target: "downloaded", label: "Ready to install" },
  { target: "up-to-date", label: "Installed" },
  { target: "error", label: "Error" },
  { target: "idle", label: "Reset" }
];

function getUpdateStatusSummary(status: ReleaseVersionStatus | null): { label: string; detail: string | null } {
  if (status === null) {
    return {
      label: "Checking for updates...",
      detail: null
    };
  }

  switch (status.kind) {
    case "available":
      return {
        label: "Update available",
        detail: `Latest version: ${status.latestVersion}`
      };
    case "up-to-date":
      return {
        label: "Up to date",
        detail: `Latest version: ${status.latestVersion}`
      };
    case "error":
      return {
        label: "Unable to check for updates",
        detail: status.message
      };
    default:
      return {
        label: "Checking for updates...",
        detail: null
      };
  }
}

export function AboutDialog({
  open,
  onOpenChange
}: AboutDialogProps) {
  const [isThirdPartyNoticesOpen, setIsThirdPartyNoticesOpen] = useState(false);
  const [thirdPartyNoticesContent, setThirdPartyNoticesContent] = useState<string>("");
  const [isLoadingThirdPartyNotices, setIsLoadingThirdPartyNotices] = useState(false);
  const [thirdPartyNoticesError, setThirdPartyNoticesError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<ReleaseVersionStatus | null>(null);
  const [hasAttemptedUpdateCheck, setHasAttemptedUpdateCheck] = useState(false);
  const [autoUpdateTestingEnabled, setAutoUpdateTestingEnabled] = useState(false);
  const [runningAutoUpdateTestTarget, setRunningAutoUpdateTestTarget] = useState<AutoUpdateTestTarget | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    setHasAttemptedUpdateCheck(false);
    setUpdateStatus(null);
    setRunningAutoUpdateTestTarget(null);

    noraSystemClient.getReleaseVersionStatus().then((status) => {
      if (!mounted) {
        return;
      }

      setUpdateStatus(status);
      setHasAttemptedUpdateCheck(true);
    }).catch((error: unknown) => {
      if (!mounted) {
        return;
      }

      setUpdateStatus({
        kind: "error",
        currentVersion: APP_VERSION,
        message: error instanceof Error ? error.message : "Unable to check for updates.",
        releaseUrl: ""
      });
      setHasAttemptedUpdateCheck(true);
    });

    noraSystemClient.getAutoUpdateTestSupport().then((support) => {
      if (!mounted) {
        return;
      }

      setAutoUpdateTestingEnabled(support.enabled);
    }).catch(() => {
      if (!mounted) {
        return;
      }

      setAutoUpdateTestingEnabled(false);
    });

    return () => {
      mounted = false;
    };
  }, [open]);

  const installedVersion = updateStatus?.currentVersion || APP_VERSION;
  const latestVersion = updateStatus?.kind === "available" || updateStatus?.kind === "up-to-date"
    ? updateStatus.latestVersion
    : null;
  const updateSummary = hasAttemptedUpdateCheck ? getUpdateStatusSummary(updateStatus) : getUpdateStatusSummary(null);
  const runAutoUpdateSimulation = (target: AutoUpdateTestTarget): void => {
    setRunningAutoUpdateTestTarget(target);
    void noraSystemClient.simulateAutoUpdateStatus(target)
      .catch(() => undefined)
      .finally(() => {
        setRunningAutoUpdateTestTarget((current) => (current === target ? null : current));
      });
  };
  const openThirdPartyNotices = (): void => {
    setIsThirdPartyNoticesOpen(true);
    if (thirdPartyNoticesContent || isLoadingThirdPartyNotices) {
      return;
    }
    setIsLoadingThirdPartyNotices(true);
    setThirdPartyNoticesError(null);
    void fetch("./THIRD_PARTY_NOTICES.md").then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load notices (HTTP ${response.status})`);
      }
      const content = await response.text();
      setThirdPartyNoticesContent(content);
    }).catch((error: unknown) => {
      setThirdPartyNoticesError(error instanceof Error ? error.message : "Failed to load third-party notices.");
    }).finally(() => {
      setIsLoadingThirdPartyNotices(false);
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onClose={() => onOpenChange(false)} headerTitle={`About ${APP_SHORT_NAME}`} className="max-w-[560px]">
          <DialogHeader>
            <DialogDescription>{APP_DESCRIPTION}</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col items-center gap-5 text-center">
            <AppMark className="size-20 text-primary" />
            <div className="space-y-2">
              <div className="text-lg font-semibold text-foreground">{APP_NAME}</div>
              <div className="text-sm font-medium text-muted-foreground">Installed version {installedVersion}</div>
              <div className="max-w-md text-sm leading-6 text-muted-foreground">
                Launch and manage multiple agent sessions with shared read access, exclusive write access, live terminal control, and git-aware workflow support.
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-left">
                <div className="text-sm font-medium text-foreground">{updateSummary.label}</div>
                {latestVersion ? (
                  <div className="mt-1 text-sm text-muted-foreground">Latest version {latestVersion}</div>
                ) : null}
                {updateSummary.detail && (!latestVersion || updateSummary.detail !== `Latest version: ${latestVersion}`) ? (
                  <div className="mt-1 text-sm text-muted-foreground">{updateSummary.detail}</div>
                ) : null}
              </div>
              <div className="rounded-lg border border-border/70 bg-background/50 px-4 py-3 text-left">
                <div className="text-sm font-medium text-foreground">Copyright and License</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Copyright (c) Citosoft. All rights reserved.
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Created and owned by{" "}
                  <a
                    href="https://www.citosoft.co.uk"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    www.citosoft.co.uk
                  </a>
                  .
                </div>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={openThirdPartyNotices}>
                    Third-Party Notices
                  </Button>
                </div>
              </div>
              {autoUpdateTestingEnabled ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-background/60 px-4 py-3 text-left">
                  <div className="text-sm font-medium text-foreground">Local update testing</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Simulate updater states locally to verify the banner and install flow without publishing a release.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {AUTO_UPDATE_TEST_ACTIONS.map((action) => (
                      <Button
                        key={action.target}
                        variant="outline"
                        size="sm"
                        disabled={runningAutoUpdateTestTarget !== null}
                        onClick={() => runAutoUpdateSimulation(action.target)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isThirdPartyNoticesOpen} onOpenChange={setIsThirdPartyNoticesOpen}>
        <DialogContent
          onClose={() => setIsThirdPartyNoticesOpen(false)}
          headerTitle="Third-Party Notices"
          className="max-w-[900px]"
        >
          <DialogBody className="min-h-[420px]">
            {isLoadingThirdPartyNotices ? (
              <div className="text-sm text-muted-foreground">Loading notices...</div>
            ) : thirdPartyNoticesError ? (
              <div className="text-sm text-destructive">{thirdPartyNoticesError}</div>
            ) : (
              <MarkdownRenderer className="max-w-none">
                {thirdPartyNoticesContent || "No third-party notices were found."}
              </MarkdownRenderer>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsThirdPartyNoticesOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

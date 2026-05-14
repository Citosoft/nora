import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { AppMark } from "@/components/app/shared/AppMark";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { AboutDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, APP_VERSION } from "@shared/appMeta";
import type {
  AutoUpdateTestTarget,
  LatestReleaseAssetsResult,
  ReleaseAssetDownloadProgressPayload,
  ReleaseAssetDownloadResult,
  ReleaseAssetSummary,
  ReleaseVersionStatus
} from "@shared/appTypes";
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

function getMinimalUpdateLabel(status: ReleaseVersionStatus | null, hasAttemptedUpdateCheck: boolean): string {
  if (!hasAttemptedUpdateCheck || status === null) {
    return "Checking for updates";
  }

  switch (status.kind) {
    case "available":
      return "Update available";
    case "up-to-date":
      return "Up to date";
    case "error":
      return "Update check failed";
    default:
      return "Checking for updates";
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
  const [isAutoUpdateTestingExpanded, setIsAutoUpdateTestingExpanded] = useState(false);
  const [runningAutoUpdateTestTarget, setRunningAutoUpdateTestTarget] = useState<AutoUpdateTestTarget | null>(null);
  const [isReleaseAssetDialogOpen, setIsReleaseAssetDialogOpen] = useState(false);
  const [isLoadingReleaseAssets, setIsLoadingReleaseAssets] = useState(false);
  const [releaseAssetsResult, setReleaseAssetsResult] = useState<LatestReleaseAssetsResult | null>(null);
  const [selectedReleaseAssetDownloadUrl, setSelectedReleaseAssetDownloadUrl] = useState<string>("");
  const [isDownloadingReleaseAsset, setIsDownloadingReleaseAsset] = useState(false);
  const [releaseAssetDownloadResult, setReleaseAssetDownloadResult] = useState<ReleaseAssetDownloadResult | null>(null);
  const [releaseAssetDownloadProgress, setReleaseAssetDownloadProgress] = useState<ReleaseAssetDownloadProgressPayload | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    setHasAttemptedUpdateCheck(false);
    setUpdateStatus(null);
    setIsAutoUpdateTestingExpanded(false);
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

  useEffect(() => noraSystemClient.onReleaseAssetDownloadProgress((payload) => {
    setReleaseAssetDownloadProgress(payload);
  }), []);

  const installedVersion = updateStatus?.currentVersion || APP_VERSION;
  const latestVersion = updateStatus?.kind === "available" || updateStatus?.kind === "up-to-date"
    ? updateStatus.latestVersion
    : null;
  const updateSummary = hasAttemptedUpdateCheck ? getUpdateStatusSummary(updateStatus) : getUpdateStatusSummary(null);
  const minimalUpdateLabel = getMinimalUpdateLabel(updateStatus, hasAttemptedUpdateCheck);
  const canDownloadUpdateFromReleasePage = updateStatus !== null
    && updateStatus.kind === "available"
    && updateStatus.releaseUrl.trim().length > 0;
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

  const handleOpenReleaseAssetDialog = (): void => {
    setIsReleaseAssetDialogOpen(true);
    setIsLoadingReleaseAssets(true);
    setReleaseAssetsResult(null);
    setSelectedReleaseAssetDownloadUrl("");
    setIsDownloadingReleaseAsset(false);
    setReleaseAssetDownloadResult(null);
    setReleaseAssetDownloadProgress(null);

    void noraSystemClient.getLatestReleaseAssets().then((result) => {
      setReleaseAssetsResult(result);
      if (result.kind === "success" && result.assets.length > 0) {
        setSelectedReleaseAssetDownloadUrl(result.assets[0].downloadUrl);
      }
    }).catch((error: unknown) => {
      setReleaseAssetsResult({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to fetch release assets."
      });
    }).finally(() => {
      setIsLoadingReleaseAssets(false);
    });
  };

  const selectedReleaseAsset: ReleaseAssetSummary | null = releaseAssetsResult?.kind === "success"
    ? releaseAssetsResult.assets.find((asset) => asset.downloadUrl === selectedReleaseAssetDownloadUrl) ?? null
    : null;

  const handleDownloadSelectedReleaseAsset = (): void => {
    if (!selectedReleaseAsset) {
      return;
    }

    setIsDownloadingReleaseAsset(true);
    setReleaseAssetDownloadResult(null);
    setReleaseAssetDownloadProgress(null);

    void noraSystemClient.downloadReleaseAsset({
      downloadUrl: selectedReleaseAsset.downloadUrl,
      fileName: selectedReleaseAsset.name
    }).then((result) => {
      setReleaseAssetDownloadResult(result);
    }).catch((error: unknown) => {
      setReleaseAssetDownloadResult({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to download release asset."
      });
    }).finally(() => {
      setIsDownloadingReleaseAsset(false);
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onClose={() => onOpenChange(false)} headerTitle={`About ${APP_SHORT_NAME}`} className="max-w-[520px]">
          <DialogHeader>
            <DialogDescription className="text-xs">
              {APP_DESCRIPTION}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid grid-cols-2 gap-3">
            <div className="col-span-2 rounded-md border border-border/60 bg-background/60 p-3">
              <div className="flex items-center gap-3">
                <AppMark className="size-10 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{APP_NAME}</div>
                  <div className="text-xs text-muted-foreground">v{installedVersion}</div>
                </div>
              </div>
              <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Update status</span>
                  <span className="text-xs font-medium text-foreground">{minimalUpdateLabel}</span>
                </div>
                {latestVersion ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Latest version</span>
                    <span className="text-xs text-foreground">{latestVersion}</span>
                  </div>
                ) : null}
                {updateSummary.detail && (!latestVersion || updateSummary.detail !== `Latest version: ${latestVersion}`) ? (
                  <div className="text-xs text-muted-foreground">{updateSummary.detail}</div>
                ) : null}
                {canDownloadUpdateFromReleasePage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleOpenReleaseAssetDialog}
                  >
                    Download latest release
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="col-span-2 space-y-2 rounded-md border border-border/70 bg-background/50 p-3">
              <div className="text-xs font-medium text-foreground">License</div>
              <div className="text-xs text-muted-foreground">
                Copyright (c) Citosoft. All rights reserved.
              </div>
              <div className="text-xs text-muted-foreground">
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
              <Button variant="outline" size="sm" className="w-full" onClick={openThirdPartyNotices}>
                Third-Party Notices
              </Button>
            </div>

            {autoUpdateTestingEnabled ? (
              <div className="col-span-2 space-y-2 rounded-md border border-dashed border-border/70 bg-background/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-foreground">Local update testing</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAutoUpdateTestingExpanded((current) => !current)}
                  >
                    {isAutoUpdateTestingExpanded ? "Hide" : "Show"}
                  </Button>
                </div>
                {isAutoUpdateTestingExpanded ? (
                  <>
                    <div className="text-xs text-muted-foreground">
                      Simulate updater states locally.
                    </div>
                    <div className="grid grid-cols-2 gap-2">
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
                  </>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
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
      <Dialog open={isReleaseAssetDialogOpen} onOpenChange={setIsReleaseAssetDialogOpen}>
        <DialogContent
          onClose={() => setIsReleaseAssetDialogOpen(false)}
          headerTitle="Download Latest Release"
          className="max-w-[540px]"
        >
          <DialogBody className="space-y-3">
            {isLoadingReleaseAssets ? (
              <div className="text-sm text-muted-foreground">Loading release assets...</div>
            ) : null}
            {!isLoadingReleaseAssets && releaseAssetsResult?.kind === "error" ? (
              <div className="space-y-2">
                <div className="text-sm text-destructive">{releaseAssetsResult.message}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenReleaseAssetDialog}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {!isLoadingReleaseAssets && releaseAssetsResult?.kind === "success" ? (
              <>
                <div className="text-sm text-muted-foreground">
                  Choose a {APP_SHORT_NAME} v{releaseAssetsResult.latestVersion} asset to download.
                </div>
                {releaseAssetsResult.assets.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No downloadable assets were found for this release.</div>
                ) : (
                  <div className="max-h-[240px] space-y-2 overflow-auto rounded-md border border-border/70 p-2">
                    {releaseAssetsResult.assets.map((asset) => {
                      const checked = asset.downloadUrl === selectedReleaseAssetDownloadUrl;
                      const sizeLabel = asset.sizeBytes > 0
                        ? `${Math.max(1, Math.round(asset.sizeBytes / 1024 / 1024))} MB`
                        : "Unknown size";
                      return (
                        <label
                          key={asset.downloadUrl}
                          className="flex cursor-pointer items-start gap-2 rounded border border-border/60 bg-background/60 p-2"
                        >
                          <input
                            type="radio"
                            name="release-asset"
                            checked={checked}
                            onChange={() => setSelectedReleaseAssetDownloadUrl(asset.downloadUrl)}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">{asset.name}</div>
                            <div className="text-xs text-muted-foreground">{sizeLabel}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}
            {releaseAssetDownloadResult?.kind === "success" ? (
              <div className="space-y-2 rounded-md border border-border/70 bg-muted/30 p-3">
                <div className="text-sm font-medium text-foreground">Downloaded {releaseAssetDownloadResult.fileName}</div>
                <div className="text-xs text-muted-foreground">{releaseAssetDownloadResult.filePath}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void noraSystemClient.revealFileInFolder(releaseAssetDownloadResult.filePath)}
                >
                  Show in folder
                </Button>
              </div>
            ) : null}
            {releaseAssetDownloadResult?.kind === "error" ? (
              <div className="text-sm text-destructive">{releaseAssetDownloadResult.message}</div>
            ) : null}
            {isDownloadingReleaseAsset && releaseAssetDownloadProgress ? (
              <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">{releaseAssetDownloadProgress.fileName}</span>
                  <span className="text-xs font-medium text-foreground">
                    {releaseAssetDownloadProgress.percent !== null ? `${releaseAssetDownloadProgress.percent}%` : "Downloading"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-primary transition-[width] duration-150"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, releaseAssetDownloadProgress.percent ?? 0)
                      )}%`
                    }}
                  />
                </div>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReleaseAssetDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleDownloadSelectedReleaseAsset}
              disabled={
                isLoadingReleaseAssets
                || isDownloadingReleaseAsset
                || !selectedReleaseAsset
              }
            >
              {isDownloadingReleaseAsset ? "Downloading..." : "Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

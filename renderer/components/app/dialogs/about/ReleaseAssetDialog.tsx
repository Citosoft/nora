import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { formatReleaseAssetSize } from "@/components/app/logic/aboutDialogStatus";
import type { ReleaseAssetDialogProps } from "@/components/app/types/aboutDialog.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { APP_SHORT_NAME } from "@shared/appMeta";
import { CircleCheck, Package } from "lucide-react";

export function ReleaseAssetDialog({ releaseAssets }: ReleaseAssetDialogProps) {
  const { result, progress, downloadResult } = releaseAssets;
  const close = (): void => releaseAssets.setOpen(false);
  const progressPercent = Math.max(0, Math.min(100, progress?.percent ?? 0));

  return (
    <Dialog open={releaseAssets.open} onOpenChange={releaseAssets.setOpen}>
      <DialogContent onClose={close} headerTitle="Download latest release" className="max-w-[520px]">
        <DialogBody className="space-y-4">
          {releaseAssets.isLoading ? (
            <DialogDescription>Loading release assets…</DialogDescription>
          ) : null}

          {!releaseAssets.isLoading && result?.kind === "error" ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <div className="text-sm text-destructive">{result.message}</div>
              <Button variant="outline" size="sm" onClick={releaseAssets.show}>
                Retry
              </Button>
            </div>
          ) : null}

          {!releaseAssets.isLoading && result?.kind === "success" ? (
            <>
              <DialogDescription>
                Choose a {APP_SHORT_NAME} v{result.latestVersion} asset to download.
              </DialogDescription>
              {result.assets.length === 0 ? (
                <div className="text-sm text-muted-foreground">No downloadable assets were found for this release.</div>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Release assets"
                  className="max-h-[260px] divide-y divide-border/60 overflow-auto rounded-lg border border-border/60"
                >
                  {result.assets.map((asset) => {
                    const checked = asset.downloadUrl === releaseAssets.selectedDownloadUrl;
                    return (
                      <label
                        key={asset.downloadUrl}
                        className={[
                          "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring",
                          checked ? "bg-primary/10" : "bg-background hover:bg-accent/50"
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="release-asset"
                          checked={checked}
                          onChange={() => releaseAssets.setSelectedDownloadUrl(asset.downloadUrl)}
                          className="sr-only"
                        />
                        <Package
                          className={checked ? "size-4 shrink-0 text-primary" : "size-4 shrink-0 text-muted-foreground"}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-xs text-foreground">{asset.name}</div>
                          <div className="text-xs text-muted-foreground">{formatReleaseAssetSize(asset.sizeBytes)}</div>
                        </div>
                        {checked ? <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          {releaseAssets.isDownloading && progress ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-muted-foreground">{progress.fileName}</span>
                <span className="font-medium text-foreground">
                  {progress.percent !== null ? `${progress.percent}%` : "Downloading"}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent ?? undefined}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          ) : null}

          {downloadResult?.kind === "success" ? (
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <CircleCheck className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">Downloaded {downloadResult.fileName}</div>
                <div className="truncate text-xs text-muted-foreground">{downloadResult.filePath}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void noraSystemClient.revealFileInFolder(downloadResult.filePath)}
              >
                Show in folder
              </Button>
            </div>
          ) : null}

          {downloadResult?.kind === "error" ? (
            <div className="text-sm text-destructive">{downloadResult.message}</div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Close
          </Button>
          <Button
            onClick={releaseAssets.download}
            disabled={releaseAssets.isLoading || releaseAssets.isDownloading || !releaseAssets.selectedAsset}
          >
            {releaseAssets.isDownloading ? "Downloading…" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

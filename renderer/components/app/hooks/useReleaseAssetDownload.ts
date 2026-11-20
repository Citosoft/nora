import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { ReleaseAssetDownloadState } from "@/components/app/types/aboutDialog.types";
import type {
  LatestReleaseAssetsResult,
  ReleaseAssetDownloadProgressPayload,
  ReleaseAssetDownloadResult
} from "@shared/appTypes";
import { useCallback, useEffect, useState } from "react";

/** Drives the "download latest release" picker: list assets, choose one, download with progress. */
export function useReleaseAssetDownload(): ReleaseAssetDownloadState {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LatestReleaseAssetsResult | null>(null);
  const [selectedDownloadUrl, setSelectedDownloadUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadResult, setDownloadResult] = useState<ReleaseAssetDownloadResult | null>(null);
  const [progress, setProgress] = useState<ReleaseAssetDownloadProgressPayload | null>(null);

  useEffect(() => noraSystemClient.onReleaseAssetDownloadProgress(setProgress), []);

  const show = useCallback((): void => {
    setOpen(true);
    setIsLoading(true);
    setResult(null);
    setSelectedDownloadUrl("");
    setIsDownloading(false);
    setDownloadResult(null);
    setProgress(null);

    void noraSystemClient.getLatestReleaseAssets().then((nextResult) => {
      setResult(nextResult);
      if (nextResult.kind === "success" && nextResult.assets.length > 0) {
        setSelectedDownloadUrl(nextResult.assets[0].downloadUrl);
      }
    }).catch((error: unknown) => {
      setResult({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to fetch release assets."
      });
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const selectedAsset = result?.kind === "success"
    ? result.assets.find((asset) => asset.downloadUrl === selectedDownloadUrl) ?? null
    : null;

  const download = useCallback((): void => {
    if (!selectedAsset) {
      return;
    }

    setIsDownloading(true);
    setDownloadResult(null);
    setProgress(null);
    void noraSystemClient.downloadReleaseAsset({
      downloadUrl: selectedAsset.downloadUrl,
      fileName: selectedAsset.name
    }).then(setDownloadResult).catch((error: unknown) => {
      setDownloadResult({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to download release asset."
      });
    }).finally(() => {
      setIsDownloading(false);
    });
  }, [selectedAsset]);

  return {
    open,
    setOpen,
    show,
    isLoading,
    result,
    selectedDownloadUrl,
    setSelectedDownloadUrl,
    selectedAsset,
    isDownloading,
    downloadResult,
    progress,
    download
  };
}

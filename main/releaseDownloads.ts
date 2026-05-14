import { APP_SHORT_NAME } from "@shared/appMeta";
import type {
  LatestReleaseAssetsResult,
  ReleaseAssetDownloadProgressPayload,
  ReleaseAssetDownloadResult
} from "@shared/appTypes";
import { app } from "electron";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getLatestPublicReleaseApiUrl, getLatestPublicReleaseUrl } from "./updateRepository";
import type { GithubLatestReleaseApiResponse } from "./types/internal.types";

function normalizeVersion(tagName: string): string {
  return tagName.trim().replace(/^v/i, "");
}

function isMetadataAssetFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".yml")
    || lower.endsWith(".yaml")
    || lower.endsWith(".json")
    || lower.endsWith(".blockmap")
    || lower.endsWith(".sha256")
    || lower.endsWith(".sha512")
    || lower.endsWith(".sig")
    || lower.endsWith(".asc")
    || lower.includes("checksum")
    || lower.includes("checksums")
    || lower.includes("latest");
}

function isBinaryAssetForCurrentPlatform(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (isMetadataAssetFile(lower)) {
    return false;
  }

  if (process.platform === "win32") {
    return lower.endsWith(".exe") || lower.endsWith(".msi");
  }

  if (process.platform === "darwin") {
    return lower.endsWith(".dmg") || lower.endsWith(".zip") || lower.endsWith(".pkg");
  }

  if (process.platform === "linux") {
    return lower.endsWith(".deb")
      || lower.endsWith(".rpm")
      || lower.endsWith(".appimage")
      || lower.endsWith(".tar.gz")
      || lower.endsWith(".tar.xz");
  }

  return false;
}

function sanitizeAssetFileName(name: string): string {
  const trimmed = name.trim();
  const fallback = "release-asset";
  const base = trimmed.length > 0 ? trimmed : fallback;
  return base.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-");
}

export function getReleaseInstallerScriptCommandForLocalTerminal(
  platform: NodeJS.Platform = process.platform
): string | null {
  if (platform === "win32") {
    return "irm https://withnora.run/install.ps1 | iex";
  }

  if (platform === "linux") {
    return "curl -fsSL https://withnora.run/install.sh | bash";
  }

  if (platform === "darwin") {
    return "curl -fsSL https://withnora.run/install-macos.sh | bash";
  }

  return null;
}

async function resolveUniqueFilePath(directoryPath: string, fileName: string): Promise<string> {
  const ext = path.extname(fileName);
  const stem = ext.length > 0 ? fileName.slice(0, -ext.length) : fileName;

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidateName = attempt === 0 ? fileName : `${stem} (${attempt})${ext}`;
    const candidatePath = path.join(directoryPath, candidateName);
    try {
      await access(candidatePath);
    } catch {
      return candidatePath;
    }
  }

  throw new Error("Unable to allocate a unique file path for the release asset.");
}

export async function getLatestReleaseAssets(): Promise<LatestReleaseAssetsResult> {
  const currentVersion = app.getVersion();

  try {
    const response = await fetch(getLatestPublicReleaseApiUrl(), {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `${APP_SHORT_NAME}/${currentVersion}`
      },
      signal: AbortSignal.timeout(15_000)
    });

    if (!response.ok) {
      return {
        kind: "error",
        message: `Unable to fetch release assets (${response.status}).`
      };
    }

    const payload = (await response.json()) as GithubLatestReleaseApiResponse;
    const tagName = typeof payload.tag_name === "string" ? payload.tag_name : null;
    const latestVersion = tagName ? normalizeVersion(tagName) : currentVersion;
    const releaseUrl = typeof payload.html_url === "string" && payload.html_url.trim().length > 0
      ? payload.html_url
      : getLatestPublicReleaseUrl();

    const rawAssets = Array.isArray(payload.assets) ? payload.assets : [];
    const normalizedAssets = rawAssets.flatMap((asset) => {
      if (!asset || typeof asset !== "object") {
        return [];
      }
      const entry = asset as Record<string, unknown>;

      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      const downloadUrl = typeof entry.browser_download_url === "string" ? entry.browser_download_url.trim() : "";
      const sizeBytes = typeof entry.size === "number" && Number.isFinite(entry.size) ? Math.max(0, Math.round(entry.size)) : 0;
      const contentType = typeof entry.content_type === "string" && entry.content_type.trim().length > 0
        ? entry.content_type
        : null;

      if (!name || !downloadUrl) {
        return [];
      }
      if (!isBinaryAssetForCurrentPlatform(name)) {
        return [];
      }

      return [{
        name,
        downloadUrl,
        sizeBytes,
        contentType
      }];
    });

    return {
      kind: "success",
      latestVersion,
      releaseUrl,
      assets: normalizedAssets
    };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Unable to fetch release assets."
    };
  }
}

export async function readReleaseAssetResponseBytes(
  response: Response,
  fileName: string,
  onProgress?: (payload: ReleaseAssetDownloadProgressPayload) => void
): Promise<{
  bytes: Uint8Array;
  totalBytes: number | null;
  emittedProgress: boolean;
}> {
  if (!response.body) {
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      totalBytes: null,
      emittedProgress: false
    };
  }

  const totalHeader = response.headers.get("content-length");
  const parsedTotal = totalHeader ? Number.parseInt(totalHeader, 10) : Number.NaN;
  const totalBytes = Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloadedBytes = 0;
  let emittedProgress = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value || value.byteLength === 0) {
      continue;
    }

    chunks.push(value);
    downloadedBytes += value.byteLength;
    emittedProgress = true;
    onProgress?.({
      fileName,
      downloadedBytes,
      totalBytes,
      percent: totalBytes !== null
        ? Math.min(100, Math.max(0, Math.round((downloadedBytes / totalBytes) * 100)))
        : null
    });
  }

  return {
    bytes: new Uint8Array(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), downloadedBytes)),
    totalBytes,
    emittedProgress
  };
}

export async function downloadReleaseAsset(
  downloadUrl: string,
  fileName: string,
  onProgress?: (payload: ReleaseAssetDownloadProgressPayload) => void
): Promise<ReleaseAssetDownloadResult> {
  const currentVersion = app.getVersion();
  let targetPath: string | null = null;

  try {
    const resolvedFileName = sanitizeAssetFileName(fileName);
    const downloadsDirectory = app.getPath("downloads");
    await mkdir(downloadsDirectory, { recursive: true });
    targetPath = await resolveUniqueFilePath(downloadsDirectory, resolvedFileName);

    const response = await fetch(downloadUrl, {
      headers: {
        Accept: "application/octet-stream",
        "User-Agent": `${APP_SHORT_NAME}/${currentVersion}`
      },
      signal: AbortSignal.timeout(120_000)
    });

    if (!response.ok) {
      return {
        kind: "error",
        message: `Unable to download asset (${response.status}).`
      };
    }

    const { bytes, totalBytes: responseTotalBytes, emittedProgress } = await readReleaseAssetResponseBytes(
      response,
      resolvedFileName,
      onProgress
    );
    const totalBytes = responseTotalBytes ?? bytes.byteLength;
    await writeFile(targetPath, bytes, { flag: "wx" });
    if (!emittedProgress || responseTotalBytes === null) {
      onProgress?.({
        fileName: resolvedFileName,
        downloadedBytes: bytes.byteLength,
        totalBytes,
        percent: 100
      });
    }

    return {
      kind: "success",
      filePath: targetPath,
      fileName: path.basename(targetPath)
    };
  } catch (error) {
    if (targetPath) {
      await rm(targetPath, { force: true }).catch(() => undefined);
    }
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Unable to download release asset."
    };
  }
}

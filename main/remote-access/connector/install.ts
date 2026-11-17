import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, writeFile, mkdtemp } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { ConnectorInstallOptions } from "@main/types/remote-access/connector/connector.types";
import { CONNECTOR_VERSION, connectorAsset } from "./assets";

const runFile = promisify(execFile);
const MAX_DOWNLOAD = 80 * 1024 * 1024;
const hash = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex");

export async function installConnector(options: ConnectorInstallOptions, signal: AbortSignal, progress: (fraction: number | null) => void): Promise<string> {
  const asset = connectorAsset(options.platform, options.arch);
  const directory = path.join(options.directory, CONNECTOR_VERSION, `${options.platform}-${options.arch}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const downloadPath = path.join(directory, asset.name);
  let bytes: Buffer | null = null;
  try {
    const cached = await readFile(downloadPath);
    if (hash(cached) === asset.sha256) bytes = cached;
  } catch { /* Missing or corrupt cache is replaced only after verifying the pinned download. */ }
  signal.throwIfAborted();
  if (!bytes) {
    progress(null);
    const response = await options.fetch(`https://github.com/cloudflare/cloudflared/releases/download/${CONNECTOR_VERSION}/${asset.name}`,
      { signal: AbortSignal.any([signal, AbortSignal.timeout(120_000)]), redirect: "follow" });
    if (!response.ok || !response.body) throw new Error("The remote connector could not be downloaded. Check your connection and retry.");
    const reader = response.body.getReader();
    const length = Number(response.headers.get("Content-Length"));
    const chunks: Uint8Array[] = [];
    let size = 0;
    let lastPercent = -1;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_DOWNLOAD) { await reader.cancel(); throw new Error("The connector download exceeded its size limit."); }
        chunks.push(chunk.value);
        const percent = length > 0 ? Math.min(100, Math.floor(size * 100 / length)) : -1;
        if (percent !== lastPercent) { lastPercent = percent; progress(percent / 100); }
      }
    } finally { reader.releaseLock(); }
    bytes = Buffer.concat(chunks);
    if (hash(bytes) !== asset.sha256) throw new Error("The remote connector failed its integrity check. Retry the download.");
    signal.throwIfAborted();
    const temporary = `${downloadPath}.${randomUUID()}.tmp`;
    try { await writeFile(temporary, bytes, { mode: 0o700, flag: "wx" }); await rename(temporary, downloadPath); }
    finally { await rm(temporary, { force: true }); }
  }
  signal.throwIfAborted();
  if (!asset.archive) { await chmod(downloadPath, 0o700); return downloadPath; }
  // Only macOS assets are archives. The archive itself is pinned, and only its exact executable is extracted.
  const temporary = await mkdtemp(path.join(directory, "extract-"));
  try {
    await runFile("/usr/bin/tar", ["-xzf", downloadPath, "-C", temporary, "cloudflared"], { signal, timeout: 15_000 });
    const executable = path.join(directory, "cloudflared");
    await chmod(path.join(temporary, "cloudflared"), 0o700);
    signal.throwIfAborted();
    await rename(path.join(temporary, "cloudflared"), executable);
    return executable;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

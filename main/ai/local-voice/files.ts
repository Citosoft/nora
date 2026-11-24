import { execFile } from "node:child_process";
import { constants } from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Streams a download to disk so large models never sit in memory. */
export async function downloadToFile(url: string, targetPath: string, label: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Unable to download ${label} (${response.status}).`);
  }
  await fsPromises.mkdir(path.dirname(targetPath), { recursive: true });
  const file = await fsPromises.open(targetPath, "w");
  try {
    const reader = response.body.getReader();
    while (true) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      await file.write(Buffer.from(next.value));
    }
  } finally {
    await file.close();
  }
  const stats = await fsPromises.stat(targetPath);
  if (!stats.isFile() || stats.size === 0) {
    throw new Error(`The downloaded ${label} was empty.`);
  }
}

/** Unpacks a .tar.bz2 into `destination`, dropping the archive's top-level folder. Uses the system tar (bsdtar on macOS and Windows). */
export async function extractTarBz2(archivePath: string, destination: string): Promise<void> {
  await fsPromises.mkdir(destination, { recursive: true });
  await execFileAsync("tar", ["-xjf", archivePath, "-C", destination, "--strip-components=1"], { maxBuffer: 1024 * 1024 * 8 });
}

export async function isExecutableFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fsPromises.stat(filePath);
    if (!stats.isFile()) {
      return false;
    }
    if (process.platform === "win32") {
      return true;
    }
    await fsPromises.access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function platformExecutableName(name: string): string {
  return process.platform === "win32" ? `${name}.exe` : name;
}

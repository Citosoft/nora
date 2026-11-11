import { createHash } from "node:crypto";
import type { BigIntStats } from "node:fs";
import { normalizeComparablePath } from "@shared/pathComparison";

/** macOS device numbers change across mounts; inode and birth time survive remounts. */
export function checkoutIdentity(environmentId: string, root: string, info: Pick<BigIntStats, "dev" | "ino" | "birthtimeNs">,
  platform: NodeJS.Platform = process.platform): string {
  const path = normalizeComparablePath(root, { windows: platform === "win32" });
  const identity = platform === "darwin"
    ? ["darwin-v2", environmentId, path, String(info.ino), String(info.birthtimeNs)]
    : [environmentId, path, String(info.dev), String(info.ino)];
  return `checkout:${createHash("sha256").update(JSON.stringify(identity)).digest("hex")}`;
}

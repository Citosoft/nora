import type { NoraDetectableContextBundleSummary } from "@shared/appTypes";
import { getWorktreeDir } from "../noraPaths";
import { importAgentContextBundleIntoWorkspace } from "./agentContextArtifacts";
import { md5HexOfFile, md5HexOfUtf8String } from "./fileContentMd5";
import { buildImportedContextBundleListMetadata } from "./importedContextBundleMetadata";
import fs from "node:fs/promises";
import path from "node:path";

const CONTEXT_BUNDLE_FILE = /^context-bundle-(.+)\.md$/i;
const HEADER_READ_BYTES = 24 * 1024;
const MAX_FULL_READ_BYTES = 5 * 1024 * 1024;

function isSafeContextBundleId(bundleId: string): boolean {
  return bundleId.length > 0 && bundleId.length < 200 && /^[\w-]+$/.test(bundleId) && !bundleId.includes(".");
}

async function readUtf8FileHead(absFile: string, maxBytes: number): Promise<string> {
  const fh = await fs.open(absFile, "r");
  try {
    const stat = await fh.stat();
    const byteLength = Math.min(maxBytes, Math.max(0, Number(stat.size)));
    if (byteLength === 0) {
      return "";
    }
    const buf = Buffer.alloc(byteLength);
    const { bytesRead } = await fh.read(buf, 0, byteLength, 0);
    return buf.subarray(0, bytesRead).toString("utf8");
  } finally {
    await fh.close();
  }
}

function sortKeyMs(row: NoraDetectableContextBundleSummary): number {
  const iso = row.handoffCreatedAt || row.updatedAt;
  if (!iso) {
    return 0;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Lists `context-bundle-*.md` files next to agent context files under
 * `~/.nora/projects/<projectId>/sessions/<sessionId>/worktrees/<worktreeId>/`.
 */
export async function listNoraWorktreeDetectableContextBundles(
  projectId: string,
  sessionId: string,
  worktreeId: string
): Promise<NoraDetectableContextBundleSummary[]> {
  const dir = getWorktreeDir(projectId, sessionId, worktreeId);
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: NoraDetectableContextBundleSummary[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const match = entry.name.match(CONTEXT_BUNDLE_FILE);
    if (!match) {
      continue;
    }
    const bundleId = match[1]!;
    if (!isSafeContextBundleId(bundleId)) {
      continue;
    }
    const absFile = path.join(dir, entry.name);
    const st = await fs.stat(absFile).catch(() => null);
    const sizeBytes = st?.size ?? 0;
    let markdownForParse = "";
    let fullMarkdown: string | null = null;
    if (sizeBytes > 0 && sizeBytes <= MAX_FULL_READ_BYTES) {
      fullMarkdown = await fs.readFile(absFile, "utf8").catch(() => null);
      markdownForParse = fullMarkdown ?? "";
    } else if (sizeBytes > MAX_FULL_READ_BYTES) {
      markdownForParse = await readUtf8FileHead(absFile, HEADER_READ_BYTES).catch(() => "");
    }
    const meta = buildImportedContextBundleListMetadata(markdownForParse, {
      fullMarkdownUtf8: fullMarkdown,
      byteSize: sizeBytes
    });
    let contentMd5: string | null = null;
    if (sizeBytes <= 0) {
      contentMd5 = md5HexOfUtf8String("");
    } else if (fullMarkdown != null) {
      contentMd5 = md5HexOfUtf8String(fullMarkdown);
    } else {
      contentMd5 = await md5HexOfFile(absFile);
    }
    results.push({
      bundleId,
      fileName: entry.name,
      sizeBytes,
      updatedAt: st?.mtime.toISOString() ?? null,
      contentMd5,
      ...meta
    });
  }

  return results.sort((left, right) => sortKeyMs(right) - sortKeyMs(left));
}

/**
 * Copies a bundle from Nora worktree metadata into the git checkout's `.nora/imported_context/`.
 */
export async function importNoraWorktreeContextBundleIntoCheckout(options: {
  workspaceRoot: string;
  projectId: string;
  sessionId: string;
  worktreeId: string;
  bundleId: string;
}): Promise<string | null> {
  if (!isSafeContextBundleId(options.bundleId)) {
    return null;
  }
  const sourcePath = path.join(
    getWorktreeDir(options.projectId, options.sessionId, options.worktreeId),
    `context-bundle-${options.bundleId}.md`
  );
  try {
    await fs.access(sourcePath);
  } catch {
    return null;
  }
  return importAgentContextBundleIntoWorkspace(options.workspaceRoot, options.bundleId, sourcePath);
}

/**
 * Reads full UTF-8 contents of a `context-bundle-*.md` in Nora worktree metadata.
 * Returns null if missing, unsafe id, not a file, or larger than {@link MAX_FULL_READ_BYTES}.
 */
export async function readNoraWorktreeContextBundleUtf8(options: {
  projectId: string;
  sessionId: string;
  worktreeId: string;
  bundleId: string;
}): Promise<string | null> {
  if (!isSafeContextBundleId(options.bundleId)) {
    return null;
  }
  const absPath = path.join(
    getWorktreeDir(options.projectId, options.sessionId, options.worktreeId),
    `context-bundle-${options.bundleId}.md`
  );
  let st: import("node:fs").Stats;
  try {
    st = await fs.stat(absPath);
  } catch {
    return null;
  }
  if (!st.isFile() || st.size > MAX_FULL_READ_BYTES) {
    return null;
  }
  return fs.readFile(absPath, "utf8").catch(() => null);
}

/**
 * Deletes `context-bundle-<bundleId>.md` from Nora worktree metadata.
 * Returns true if a file was removed, false if it was already missing or the id was unsafe.
 */
export async function deleteNoraWorktreeContextBundleFile(options: {
  projectId: string;
  sessionId: string;
  worktreeId: string;
  bundleId: string;
}): Promise<boolean> {
  if (!isSafeContextBundleId(options.bundleId)) {
    return false;
  }
  const absPath = path.join(
    getWorktreeDir(options.projectId, options.sessionId, options.worktreeId),
    `context-bundle-${options.bundleId}.md`
  );
  try {
    await fs.unlink(absPath);
    return true;
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? (err as NodeJS.ErrnoException).code : undefined;
    if (code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

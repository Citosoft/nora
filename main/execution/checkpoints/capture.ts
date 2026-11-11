import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readlink, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CheckpointFile, CheckpointOmission, CheckpointCapture, FileSnapshot } from "@main/types/execution/checkpoints.types";
import type { WorkspaceAuthority } from "@main/types/execution/workspace.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { normalizeComparablePath } from "@shared/pathComparison";
import { isNotGitRepository, runWorkspaceGit } from "../gitProcess";
import { checkpointCaptureSchema, checkpointPathSchema, maxFileBytes, maxSnapshotBytes, maxSnapshotFiles } from "./schema";
import { CheckpointError } from "./errors";

function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** Git-visible files only. Never stage, commit, follow symlinks or write into the checkout. */
export function createFileCapture(executable: string, authority: WorkspaceAuthority, now: () => string,
  excludedPaths: readonly string[] = []): (workspace: WorkspaceRef) => Promise<CheckpointCapture> {
  const comparable = (path: string): string => normalizeComparablePath(path, { windows: process.platform === "win32" });
  const excluded = new Set(excludedPaths.map(comparable));
  const verify = async (workspace: WorkspaceRef): Promise<void> => {
    try { await authority.verify(workspace); } catch { throw new CheckpointError("workspace-changed"); }
  };
  const scan = async (workspace: WorkspaceRef, deadline: number): Promise<Pick<FileSnapshot, "files" | "omitted">> => {
    const { stdout } = await runWorkspaceGit(executable, workspace.path, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
    if (stdout && !stdout.endsWith("\0")) throw new CheckpointError("capture-failed");
    const paths = [...new Set(stdout ? stdout.slice(0, -1).split("\0") : [])].sort();
    if (paths.length > maxSnapshotFiles) throw new CheckpointError("limit-exceeded");
    const files: CheckpointFile[] = [];
    const omitted: CheckpointOmission[] = [];
    let total = 0;
    for (const path of paths) {
      if (Date.now() > deadline) throw new CheckpointError("limit-exceeded");
      if (!checkpointPathSchema.safeParse(path).success) throw new CheckpointError("unsupported");
      const absolute = resolve(workspace.path, path);
      if (excluded.has(comparable(absolute))) continue;
      try {
        const parent = dirname(absolute);
        if (comparable(await realpath(parent)) !== comparable(parent)) throw new CheckpointError("workspace-changed");
        const info = await lstat(absolute, { bigint: true });
        if (!info.isFile() && !info.isSymbolicLink()) throw new CheckpointError("unsupported");
        const mode = info.isSymbolicLink() ? "120000" : (info.mode & 0o111n) !== 0n ? "100755" : "100644";
        const omit = info.size > BigInt(maxFileBytes) || info.size > BigInt(maxSnapshotBytes - total);
        let content: Buffer = Buffer.alloc(0);
        let hash: string | undefined;
        let length = 0;
        if (info.isSymbolicLink()) {
          content = Buffer.from(await readlink(absolute));
          length = content.length;
          if (omit) hash = createHash("sha256").update(content).digest("hex");
        }
        else {
          const handle = await open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
          try {
            const opened = await handle.stat({ bigint: true });
            if (!opened.isFile() || opened.dev !== info.dev || opened.ino !== info.ino || opened.size !== info.size) throw new CheckpointError("workspace-changed");
            // Fingerprints keep large files comparable without retaining their bytes.
            const digest = omit ? createHash("sha256") : null;
            const buffer = Buffer.alloc(omit ? 64 * 1024 : Number(info.size) + 1);
            while (true) {
              if (Date.now() > deadline) throw new CheckpointError("limit-exceeded");
              const remaining = Number(info.size) + 1 - length;
              if (remaining <= 0) break;
              const read = await handle.read(buffer, omit ? 0 : length, Math.min(remaining, omit ? buffer.length : buffer.length - length), length);
              if (!read.bytesRead) break;
              if (digest) digest.update(buffer.subarray(0, read.bytesRead));
              length += read.bytesRead;
            }
            if (digest) hash = digest.digest("hex");
            else content = buffer.subarray(0, length);
          } finally { await handle.close(); }
        }
        const after = await lstat(absolute, { bigint: true });
        if (after.dev !== info.dev || after.ino !== info.ino || after.size !== info.size || after.mtimeNs !== info.mtimeNs
          || after.ctimeNs !== info.ctimeNs || after.mode !== info.mode || length !== Number(info.size)) throw new CheckpointError("workspace-changed");
        if (hash) omitted.push({ path, mode, hash });
        else {
          total += content.length;
          files.push({ path, mode, content: content.toString("base64") });
        }
      } catch (error) {
        if (missing(error)) continue; // Deleted tracked paths are absent from this working-tree snapshot.
        throw error;
      }
    }
    return omitted.length ? { files, omitted } : { files };
  };
  return async (workspace) => {
    try {
      await verify(workspace);
      const deadline = Date.now() + 10_000;
      const snapshot = await scan(workspace, deadline);
      const confirmation = await scan(workspace, deadline);
      await verify(workspace);
      if (Date.now() > deadline) throw new CheckpointError("limit-exceeded");
      if (JSON.stringify(snapshot) !== JSON.stringify(confirmation)) throw new CheckpointError("workspace-changed");
      return checkpointCaptureSchema.parse({ status: "ready", snapshot: { capturedAt: now(), ...snapshot } });
    } catch (error) {
      return { status: "unavailable", reason: error instanceof CheckpointError ? error.reason : isNotGitRepository(error) ? "unsupported" : "capture-failed" };
    }
  };
}

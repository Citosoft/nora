import { createHash, randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, mkdir, open, readlink, rename, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import type { RestoreFileState, RestoreOutcome, RestoreTarget } from "@main/types/execution/checkpoints.types";
import type { WorkspaceAuthority } from "@main/types/execution/workspace.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { TurnUndoConflict, TurnUndoMode } from "@shared/types/conversation/turnUndo.types";

type DiskState = { kind: "absent" } | { kind: "entry"; hash: string; mode: RestoreFileState["mode"]; permissions: number } | { kind: "other" };
type Plan = { target: RestoreTarget; action: "restore" | "done" } | { target: RestoreTarget; action: "conflict"; reason: TurnUndoConflict["reason"] };

/** Messages are bounded, so very long paths keep only their informative end. */
const shown = (path: string): string => path.length > 160 ? `…${path.slice(-160)}` : path;
const workspaceChanged = "The workspace is unavailable or has changed. Check the checkout and try again.";

function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR");
}

/** Walks from the root to the file's folder without following links; optionally creates folders the turn deleted. */
async function parentFolder(root: string, absolute: string, create: boolean): Promise<"ok" | "missing" | "unsafe"> {
  let current = root;
  for (const part of relative(root, dirname(absolute)).split(sep).filter(Boolean)) {
    current = join(current, part);
    try {
      if (!(await lstat(current)).isDirectory()) return "unsafe";
    } catch (error) {
      if (!missing(error)) throw error;
      if (!create) return "missing";
      await mkdir(current);
    }
  }
  return "ok";
}

async function diskState(root: string, absolute: string): Promise<DiskState> {
  const parent = await parentFolder(root, absolute, false);
  if (parent === "missing") return { kind: "absent" };
  if (parent === "unsafe") return { kind: "other" };
  let info;
  try { info = await lstat(absolute); } catch (error) { if (missing(error)) return { kind: "absent" }; throw error; }
  if (info.isSymbolicLink()) {
    return { kind: "entry", hash: createHash("sha256").update(Buffer.from(await readlink(absolute))).digest("hex"), mode: "120000", permissions: 0o777 };
  }
  if (!info.isFile()) return { kind: "other" };
  const handle = await open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const hash = createHash("sha256");
    const buffer = Buffer.alloc(64 * 1024);
    for (let position = 0; ;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    return { kind: "entry", hash: hash.digest("hex"), mode: (info.mode & 0o111) !== 0 ? "100755" : "100644", permissions: info.mode & 0o777 };
  } finally { await handle.close(); }
}

function holds(state: DiskState, expected: RestoreFileState | null): boolean {
  return expected === null ? state.kind === "absent" : state.kind === "entry" && state.hash === expected.hash && state.mode === expected.mode;
}

/** Keeps the file's other permission bits and only flips the executable bits Git records. */
function permissionsFor(state: DiskState, mode: RestoreFileState["mode"]): number {
  const base = state.kind === "entry" && state.mode !== "120000" ? state.permissions : 0o644;
  return mode === "100755" ? base | ((base & 0o444) >> 2) : base & ~0o111;
}

/** Writes beside the target and renames over it, so a reader never sees a half-written file. */
async function putBack(absolute: string, before: NonNullable<RestoreTarget["before"]>, content: Buffer, state: DiskState): Promise<void> {
  const temporary = join(dirname(absolute), `.${basename(absolute)}.nora-undo-${randomBytes(6).toString("hex")}`);
  try {
    if (before.mode === "120000") await symlink(content.toString("utf8"), temporary);
    else {
      await writeFile(temporary, content, { flag: "wx", mode: 0o600 });
      await chmod(temporary, permissionsFor(state, before.mode));
    }
    await rename(temporary, absolute);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function plan(root: string, target: RestoreTarget): Promise<Plan> {
  const state = await diskState(root, resolve(root, target.path));
  if (holds(state, target.before)) return { target, action: "done" };
  if (!holds(state, target.after)) return { target, action: "conflict", reason: "edited" };
  if (target.before && !target.before.content) return { target, action: "conflict", reason: "unrestorable" };
  return { target, action: "restore" };
}

/** Restores files only where they still hold exactly what the turn left; anything else is a conflict, never overwritten. */
export function createFileRestore(authority: WorkspaceAuthority): (workspace: WorkspaceRef, targets: readonly RestoreTarget[], mode: TurnUndoMode) => Promise<RestoreOutcome> {
  return async (workspace, targets, mode) => {
    const root = workspace.path;
    try { await authority.verify(workspace); } catch { return { status: "failed", message: workspaceChanged, restored: [] }; }
    const plans = await Promise.all(targets.map((target) => plan(root, target)));
    const conflicts = plans.flatMap((entry) => entry.action === "conflict" ? [{ path: entry.target.path, reason: entry.reason }] : []);
    if (conflicts.length && (mode === "all" || conflicts.length === plans.length)) return { status: "blocked", conflicts };
    const restored = plans.filter((entry) => entry.action === "done").map((entry) => entry.target.path);
    try { await authority.verify(workspace); } catch { return { status: "failed", message: workspaceChanged, restored: [] }; }
    for (const entry of plans) {
      if (entry.action !== "restore") continue;
      const { path, before, after } = entry.target;
      const absolute = resolve(root, path);
      try {
        // Re-read just before writing: anything that changed since planning is left alone.
        const state = await diskState(root, absolute);
        if (!holds(state, after)) return { status: "failed", message: `${shown(path)} changed while undoing. Nothing after it was restored; trying again is safe.`, restored };
        if (!before) await unlink(absolute);
        else {
          if (await parentFolder(root, absolute, true) !== "ok") return { status: "failed", message: `A folder above ${shown(path)} is not a plain folder, so it was left alone.`, restored };
          if (!before.content) throw new Error("Planned restore lost its content");
          await putBack(absolute, before, before.content, state);
        }
        restored.push(path);
      } catch (error) {
        const code = error instanceof Error && "code" in error && typeof error.code === "string" ? ` (${error.code})` : "";
        return { status: "failed", message: `Couldn't restore ${shown(path)}${code}. Files before it were restored; trying again is safe.`, restored };
      }
    }
    return { status: "undone", mode, restored, skipped: mode === "unconflicted" ? conflicts : [] };
  };
}

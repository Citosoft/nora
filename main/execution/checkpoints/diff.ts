import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FileSnapshot } from "@main/types/execution/checkpoints.types";
import type { TurnChange, TurnReview } from "@shared/types/conversation/review.types";
import { turnReviewSchema } from "@shared/conversations/checkpoints";
import { runWorkspaceGit } from "../gitProcess";
import { readCheckpointEntry } from "./gitObjects";
import { entryDigest, snapshotEntries } from "./entries";

const maxPatchBytes = 128 * 1024;
const maxReviewBytes = 512 * 1024;
const maxTextPatches = 128;
const binary = (content: Buffer): boolean => {
  if (content.includes(0)) return true;
  try { new TextDecoder("utf-8", { fatal: true }).decode(content); return false; } catch { return true; }
};

async function patchBody(executable: string, directory: string): Promise<string> {
  try { return (await runWorkspaceGit(executable, directory, ["diff", "--no-index", "--no-ext-diff", "--no-textconv", "--no-color", "--no-renames", "--", "before", "after"])).stdout; }
  catch (error) {
    // --no-index exits 1 for an ordinary difference; other failures must not become empty evidence.
    if (error instanceof Error && "code" in error && error.code === 1 && "stdout" in error && typeof error.stdout === "string") return error.stdout;
    throw error;
  }
}

/**
 * Compare durable bytes, never the current checkout. External edits during the interval remain included.
 * `root` is the repository whose object database holds indexed files' bytes; each read is verified against the recorded hash.
 */
export async function compareSnapshots(executable: string, root: string, baseline: FileSnapshot, final: FileSnapshot): Promise<TurnReview> {
  const before = snapshotEntries(baseline);
  const after = snapshotEntries(final);
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changes: TurnChange[] = [];
  let bytes = 0;
  let textPatches = 0;
  const patchDeadline = Date.now() + 10_000;
  const directory = await mkdtemp(join(tmpdir(), "nora-turn-diff-"));
  try {
    for (const path of paths) {
      const previous = before.get(path); const current = after.get(path);
      if (entryDigest(previous) === entryDigest(current) && previous?.mode === current?.mode) continue;
      const change: TurnChange = { path, kind: !previous ? "added" : !current ? "deleted" : "modified",
        beforeMode: previous?.mode ?? null, afterMode: current?.mode ?? null, beforeHash: entryDigest(previous), afterHash: entryDigest(current),
        presentation: "text", patch: null };
      const oldContent = await readCheckpointEntry(executable, root, previous);
      const newContent = await readCheckpointEntry(executable, root, current);
      // Fingerprint-only or unreadable bytes cannot be diffed; the shared contract reports every such case as too-large.
      if (!oldContent || !newContent) change.presentation = "too-large";
      else if (binary(oldContent) || binary(newContent)) change.presentation = "binary";
      else if (Date.now() > patchDeadline || textPatches >= maxTextPatches || bytes >= maxReviewBytes
        || oldContent.length + newContent.length > maxPatchBytes) change.presentation = "too-large";
      else {
        textPatches++;
        await writeFile(join(directory, "before"), oldContent, { mode: 0o600 });
        await writeFile(join(directory, "after"), newContent, { mode: 0o600 });
        const raw = await patchBody(executable, directory);
        const start = raw.search(/^@@ /m);
        if (start < 0 && !oldContent.equals(newContent)) throw new Error("Text diff output is incomplete");
        const mode = !previous ? `new file mode ${current?.mode}\n` : !current ? `deleted file mode ${previous.mode}\n`
          : previous.mode !== current.mode ? `old mode ${previous.mode}\nnew mode ${current.mode}\n` : "";
        const label = (prefix: string): string => JSON.stringify(`${prefix}/${path}`);
        const header = `diff --git ${label("a")} ${label("b")}\n${mode}`;
        const patch = start < 0 ? header : `${header}--- ${previous ? label("a") : "/dev/null"}\n+++ ${current ? label("b") : "/dev/null"}\n${raw.slice(start)}`;
        const size = Buffer.byteLength(patch);
        if (size > maxPatchBytes || bytes + size > maxReviewBytes) change.presentation = "too-large";
        else { change.patch = patch; bytes += size; }
      }
      changes.push(change);
    }
    return turnReviewSchema.parse({ status: "ready", scope: "turn", attribution: "observed",
      baselineAt: baseline.capturedAt, capturedAt: final.capturedAt, changes });
  } finally { await rm(directory, { recursive: true, force: true }); }
}

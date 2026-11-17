import type { WorkspaceGitExec, WorkspaceTarget } from "../types/internal.types";
import type { ChangeEntry } from "@shared/appTypes";
import type { DiffLineTotals, GitBaseBranch, GitBranchChanges, GitBranchComparison } from "../types/gitBranchChanges.types";
import { countDiffLines, mapCommitChangeStatus } from "./changeDiffUtils";
import { getExecStdout } from "./execErrors";

/** Counting untracked lines costs one process per file, so large untracked sets are counted by file only. */
const UNTRACKED_LINE_COUNT_LIMIT = 100;
const UNTRACKED_LINE_COUNT_BATCH = 8;
const BASE_BRANCH_FALLBACKS = ["main", "master", "trunk", "develop"];
/** Whole-branch patches can be large; past this the viewer reports the diff as too large instead of truncating it. */
const BRANCH_PATCH_MAX_BUFFER = 32 * 1024 * 1024;

/** Sums `git diff --numstat` output; binary files (`-\t-`) count as files without lines. */
export function parseNumstatTotals(output: string): DiffLineTotals {
  const totals: DiffLineTotals = { files: 0, additions: 0, deletions: 0 };
  for (const line of output.split(/\r?\n/)) {
    const match = /^(\d+|-)\t(\d+|-)\t/.exec(line);
    if (!match) continue;
    totals.files += 1;
    totals.additions += match[1] === "-" ? 0 : Number(match[1]);
    totals.deletions += match[2] === "-" ? 0 : Number(match[2]);
  }
  return totals;
}

/** Splits NUL-framed Git output (`-z`) into records. */
export function splitNulRecords(output: string): string[] {
  return output.split("\0").filter(Boolean);
}

async function readGit(target: WorkspaceTarget, args: string[], execGit: WorkspaceGitExec): Promise<string | null> {
  try {
    return (await execGit(target, args)).stdout;
  } catch {
    return null;
  }
}

async function hasCommit(target: WorkspaceTarget, ref: string, execGit: WorkspaceGitExec): Promise<boolean> {
  return (await readGit(target, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], execGit)) !== null;
}

/** The remote's advertised HEAD wins; otherwise the first conventional default branch that exists. */
export async function resolveGitBaseBranch(target: WorkspaceTarget, execGit: WorkspaceGitExec): Promise<GitBaseBranch | null> {
  const remoteHead = (await readGit(target, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], execGit))?.trim();
  if (remoteHead) return { branch: remoteHead.replace(/^origin\//, ""), ref: remoteHead };
  for (const branch of BASE_BRANCH_FALLBACKS) {
    for (const ref of [`origin/${branch}`, branch]) {
      if (await hasCommit(target, ref, execGit)) return { branch, ref };
    }
  }
  return null;
}

async function readUntrackedPatch(target: WorkspaceTarget, path: string, execGit: WorkspaceGitExec, numstat: boolean): Promise<string> {
  try {
    return (await execGit(target, ["diff", "--no-index", "--no-color", ...(numstat ? ["--numstat"] : []), "--", "/dev/null", path])).stdout;
  } catch (error: unknown) {
    // `--no-index` exits 1 whenever the files differ, which is always the case here.
    return getExecStdout(error);
  }
}

/** Runs one read per path in small batches so a large untracked set cannot spawn hundreds of processes at once. */
async function mapInBatches<T>(paths: readonly string[], read: (path: string) => Promise<T>): Promise<T[]> {
  const results: T[] = [];
  for (let index = 0; index < paths.length; index += UNTRACKED_LINE_COUNT_BATCH) {
    results.push(...await Promise.all(paths.slice(index, index + UNTRACKED_LINE_COUNT_BATCH).map(read)));
  }
  return results;
}

async function countUntrackedLines(target: WorkspaceTarget, paths: readonly string[], execGit: WorkspaceGitExec): Promise<number> {
  const outputs = await mapInBatches(paths, (path) => readUntrackedPatch(target, path, execGit, true));
  return outputs.reduce((total, output) => total + parseNumstatTotals(output).additions, 0);
}

/** Null for detached HEADs and non-Git folders, which have no branch to compare. */
export async function resolveGitBranchComparison(target: WorkspaceTarget, execGit: WorkspaceGitExec): Promise<GitBranchComparison | null> {
  const branch = (await readGit(target, ["symbolic-ref", "--quiet", "--short", "HEAD"], execGit))?.trim();
  if (!branch) return null;
  const base = await resolveGitBaseBranch(target, execGit);
  const mergeBase = base ? (await readGit(target, ["merge-base", "HEAD", base.ref], execGit))?.trim() || null : null;
  return { branch, base, mergeBase };
}

/**
 * Everything a change request from this checkout would show once committed: committed, staged,
 * unstaged and untracked work measured from the merge base with the default branch.
 * Returns null for detached HEADs and non-Git folders, which cannot open a change request.
 */
export async function readGitBranchChanges(target: WorkspaceTarget, execGit: WorkspaceGitExec): Promise<GitBranchChanges | null> {
  const comparison = await resolveGitBranchComparison(target, execGit);
  if (!comparison) return null;
  const { branch, base, mergeBase } = comparison;
  const [tracked, untracked, status, ahead, heads] = await Promise.all([
    readGit(target, ["diff", "--numstat", "--no-renames", mergeBase ?? "HEAD", "--"], execGit),
    readGit(target, ["ls-files", "--others", "--exclude-standard", "-z"], execGit),
    readGit(target, ["status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"], execGit),
    readGit(target, ["rev-list", "--count", base ? `${base.ref}..HEAD` : "HEAD"], execGit),
    readGit(target, ["for-each-ref", "--format=%(refname:short)", "refs/heads"], execGit)
  ]);
  const totals = parseNumstatTotals(tracked ?? "");
  const untrackedPaths = splitNulRecords(untracked ?? "");
  const untrackedAdditions = await countUntrackedLines(target, untrackedPaths.slice(0, UNTRACKED_LINE_COUNT_LIMIT), execGit);
  const branches = (heads ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    branch,
    baseBranch: base?.branch ?? null,
    files: totals.files + untrackedPaths.length,
    additions: totals.additions + untrackedAdditions,
    deletions: totals.deletions,
    partial: untrackedPaths.length > UNTRACKED_LINE_COUNT_LIMIT,
    commitsAhead: Number.parseInt(ahead?.trim() ?? "", 10) || 0,
    uncommittedFiles: splitNulRecords(status ?? "").length,
    branches: base && !branches.includes(base.branch) ? [...branches, base.branch] : branches
  };
}

/** Splits a multi-file patch into one chunk per `diff --git` header, in Git's output order. */
export function splitPatchByFile(patch: string): string[] {
  return patch.split(/^(?=diff --git )/m).filter((chunk) => chunk.startsWith("diff --git "));
}

/**
 * Per-file patches for the same changes {@link readGitBranchChanges} counts. `--name-status -z` and the patch come
 * from one diff configuration, so their files align by position and paths never have to be parsed from headers.
 */
export async function readGitBranchDiff(target: WorkspaceTarget, execGit: WorkspaceGitExec): Promise<ChangeEntry[] | null> {
  const comparison = await resolveGitBranchComparison(target, execGit);
  if (!comparison) return null;
  const from = comparison.mergeBase ?? "HEAD";
  const [names, patch, untracked] = await Promise.all([
    execGit(target, ["diff", "--name-status", "-z", "--no-renames", from, "--"]).then((result) => result.stdout),
    execGit(target, ["diff", "--no-color", "--no-ext-diff", "--no-renames", from, "--"], BRANCH_PATCH_MAX_BUFFER).then((result) => result.stdout),
    readGit(target, ["ls-files", "--others", "--exclude-standard", "-z"], execGit)
  ]);
  const records = splitNulRecords(names);
  const chunks = splitPatchByFile(patch);
  const tracked: ChangeEntry[] = [];
  for (let index = 0; index + 1 < records.length; index += 2) {
    const diff = chunks[index / 2] ?? "";
    tracked.push({ path: records[index + 1], status: mapCommitChangeStatus(records[index]),
      additions: countDiffLines(diff, "+"), deletions: countDiffLines(diff, "-"), diff });
  }
  const untrackedPaths = splitNulRecords(untracked ?? "").slice(0, UNTRACKED_LINE_COUNT_LIMIT);
  const added = await mapInBatches(untrackedPaths, async (path): Promise<ChangeEntry> => {
    const diff = await readUntrackedPatch(target, path, execGit, false);
    return { path, status: "added", additions: countDiffLines(diff, "+"), deletions: 0, diff };
  });
  return [...tracked, ...added].sort((left, right) => left.path.localeCompare(right.path));
}

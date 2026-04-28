import type { ChangeEntry, CommitHistoryEntry } from "@shared/appTypes";
import type { WorkspaceGitExec, WorkspaceTarget } from "../types/internal.types";
import { countDiffLines, mapCommitChangeStatus } from "./changeDiffUtils";
import { getExecStdout } from "./execErrors";
import { parseForgeRepoSummary } from "./forgeRepoParse";

const getWorkspaceForgeRepo = async (target: WorkspaceTarget, execGit: WorkspaceGitExec) => {
  const { stdout: remotesStdout } = await execGit(target, ["remote"]);
  const remotes = remotesStdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const remote = remotes.includes("origin") ? "origin" : remotes[0];
  if (!remote) {
    return null;
  }

  const { stdout: remoteUrlStdout } = await execGit(target, ["remote", "get-url", remote]);
  return parseForgeRepoSummary(remoteUrlStdout.trim());
};

const commitWorkspaceChanges = async (
  target: WorkspaceTarget,
  message: string,
  selectedPaths: string[] | null,
  execGit: WorkspaceGitExec
): Promise<void> => {
  const { stdout } = await execGit(target, ["status", "--short"]);
  if (!stdout.trim()) {
    throw new Error("There are no changes to commit.");
  }

  if (selectedPaths && selectedPaths.length > 0) {
    await execGit(target, ["add", "-A", "--", ...selectedPaths]);
  } else {
    await execGit(target, ["add", "-A"]);
  }

  const { stdout: stagedStdout } = await execGit(target, ["diff", "--cached", "--name-only"]);
  if (!stagedStdout.trim()) {
    throw new Error("There are no staged changes to commit.");
  }

  await execGit(target, ["commit", "-m", message]);
};

const pushWorkspaceChanges = async (target: WorkspaceTarget, execGit: WorkspaceGitExec): Promise<void> => {
  let pushArgs = ["push"];
  try {
    await execGit(target, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
  } catch {
    const { stdout: branchStdout } = await execGit(target, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const branch = branchStdout.trim();
    const { stdout: remotesStdout } = await execGit(target, ["remote"]);
    const remotes = remotesStdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const remote = remotes.includes("origin") ? "origin" : remotes[0];
    if (!remote) {
      throw new Error("This repository has no git remote configured.");
    }
    pushArgs = ["push", "--set-upstream", remote, branch];
  }

  await execGit(target, pushArgs);
};

const readCurrentBranch = async (target: WorkspaceTarget, execGit: WorkspaceGitExec): Promise<string> => {
  const { stdout } = await execGit(target, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
};

const readGitChanges = async (target: WorkspaceTarget, execGit: WorkspaceGitExec): Promise<ChangeEntry[]> => {
  const { stdout: statusStdout } = await execGit(target, ["status", "--short"]);

  const lines = statusStdout
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const changes: ChangeEntry[] = [];

  for (const line of lines) {
    const status = line.slice(0, 2).trim() || "?";
    const rawPath = line.slice(3).trim();
    const pathPart = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) ?? rawPath : rawPath;

    let diff = "";
    try {
      const args =
        status === "??"
          ? ["diff", "--no-index", "--", "/dev/null", pathPart]
          : ["diff", "--", pathPart];
      const result = await execGit(target, args);
      diff = result.stdout;
    } catch (error: unknown) {
      diff = getExecStdout(error);
    }

    changes.push({
      path: pathPart,
      status,
      additions: countDiffLines(diff, "+"),
      deletions: countDiffLines(diff, "-"),
      diff: diff || `No diff output available for ${pathPart}.`
    });
  }

  return changes;
};

const readCommitHistory = async (target: WorkspaceTarget, execGit: WorkspaceGitExec): Promise<CommitHistoryEntry[]> => {
  const format = "%H%x09%h%x09%an%x09%aI%x09%s";
  const { stdout } = await execGit(target, ["log", `--pretty=format:${format}`, "-n", "20"]);

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash = "", shortHash = "", author = "", authoredAt = "", subject = ""] = line.split("\t");
      return {
        hash,
        shortHash,
        author,
        authoredAt,
        subject
      };
    });
};

const readProjectBranches = async (target: WorkspaceTarget, execGit: WorkspaceGitExec): Promise<string[]> => {
  const { stdout } = await execGit(target, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]);

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const readCommitEntry = async (
  target: WorkspaceTarget,
  hash: string,
  execGit: WorkspaceGitExec
): Promise<CommitHistoryEntry | null> => {
  const format = "%H%x09%h%x09%an%x09%aI%x09%s";
  const { stdout } = await execGit(target, ["log", `--pretty=format:${format}`, "-n", "1", hash]);
  const line = stdout.trim();
  if (!line) {
    return null;
  }

  const [fullHash, shortHash, author, authoredAt, ...subjectParts] = line.split("\t");
  if (!fullHash || !shortHash || !author || !authoredAt || subjectParts.length === 0) {
    return null;
  }

  return {
    hash: fullHash,
    shortHash,
    author,
    authoredAt,
    subject: subjectParts.join("\t")
  };
};

const readCommitChanges = async (
  target: WorkspaceTarget,
  hash: string,
  execGit: WorkspaceGitExec
): Promise<ChangeEntry[]> => {
  const { stdout } = await execGit(target, ["show", "--format=", "--name-status", "--find-renames", hash]);

  const files = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status, ...pathParts] = line.split("\t");
      return {
        status: mapCommitChangeStatus(status || ""),
        path: pathParts[pathParts.length - 1] || ""
      };
    })
    .filter((entry) => entry.path);

  const changes = await Promise.all(
    files.map(async (file) => {
      const { stdout: diffStdout } = await execGit(target, ["show", "--format=", "--patch", hash, "--", file.path], 1024 * 1024 * 4);
      const diff = diffStdout.trim() || `No patch available for ${file.path}`;

      return {
        path: file.path,
        status: file.status,
        additions: countDiffLines(diff, "+"),
        deletions: countDiffLines(diff, "-"),
        diff
      } satisfies ChangeEntry;
    })
  );

  return changes;
};

export const createWorkspaceGitBindings = (execGit: WorkspaceGitExec) => ({
  getWorkspaceForgeRepo: (target: WorkspaceTarget) => getWorkspaceForgeRepo(target, execGit),
  commitWorkspaceChanges: (target: WorkspaceTarget, message: string, selectedPaths: string[] | null) =>
    commitWorkspaceChanges(target, message, selectedPaths, execGit),
  pushWorkspaceChanges: (target: WorkspaceTarget) => pushWorkspaceChanges(target, execGit),
  readCurrentBranch: (target: WorkspaceTarget) => readCurrentBranch(target, execGit),
  readGitChanges: (target: WorkspaceTarget) => readGitChanges(target, execGit),
  readCommitHistory: (target: WorkspaceTarget) => readCommitHistory(target, execGit),
  readProjectBranches: (target: WorkspaceTarget) => readProjectBranches(target, execGit),
  readCommitEntry: (target: WorkspaceTarget, hash: string) => readCommitEntry(target, hash, execGit),
  readCommitChanges: (target: WorkspaceTarget, hash: string) => readCommitChanges(target, hash, execGit)
});

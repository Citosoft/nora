import type { GitTrackingBranch } from "../types/gitTrackingBranch.types";
import type { WorkspaceGitExec, WorkspaceTarget } from "../types/internal.types";

function parseRemoteTrackingRef(ref: string): GitTrackingBranch | null {
  const separatorIndex = ref.indexOf("/");
  if (separatorIndex <= 0 || separatorIndex === ref.length - 1) {
    return null;
  }

  return {
    configured: true,
    remoteName: ref.slice(0, separatorIndex),
    remoteBranch: ref.slice(separatorIndex + 1),
    ref
  };
}

export async function listRemoteTrackingBranches(
  target: WorkspaceTarget,
  execGit: WorkspaceGitExec
): Promise<string[]> {
  const { stdout } = await execGit(
    target,
    ["for-each-ref", "--format=%(refname:short)%09%(symref)", "refs/remotes"],
    1024 * 1024
  );
  return stdout
    .split(/\r?\n/)
    .map((line) => {
      const [branchName = "", symbolicTarget = ""] = line.split("\t");
      return symbolicTarget.trim() ? "" : branchName.trim();
    })
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

export async function setGitTrackingBranch(
  target: WorkspaceTarget,
  execGit: WorkspaceGitExec,
  localBranch: string,
  remoteBranch: string
): Promise<void> {
  const availableBranches = await listRemoteTrackingBranches(target, execGit);
  if (!availableBranches.includes(remoteBranch)) {
    throw new Error("Choose an available remote branch.");
  }
  await execGit(target, ["branch", `--set-upstream-to=${remoteBranch}`, localBranch], 64 * 1024);
}

async function refreshRemoteBranch(
  target: WorkspaceTarget,
  execGit: WorkspaceGitExec,
  remoteName: string,
  remoteBranch: string
): Promise<void> {
  try {
    await execGit(target, ["fetch", "--quiet", remoteName, remoteBranch], 1024 * 1024);
  } catch {
    // Cached remote refs still provide useful ahead/behind state while offline.
  }
}

async function remoteBranchExists(
  target: WorkspaceTarget,
  execGit: WorkspaceGitExec,
  remoteName: string,
  remoteBranch: string
): Promise<boolean> {
  try {
    await execGit(target, ["show-ref", "--verify", "--quiet", `refs/remotes/${remoteName}/${remoteBranch}`], 64 * 1024);
    return true;
  } catch {
    return false;
  }
}

export async function resolveGitTrackingBranch(
  target: WorkspaceTarget,
  execGit: WorkspaceGitExec,
  branch: string
): Promise<GitTrackingBranch | null> {
  try {
    const { stdout } = await execGit(
      target,
      ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
      64 * 1024
    );
    const configuredTrackingBranch = parseRemoteTrackingRef(stdout.trim());
    if (configuredTrackingBranch) {
      await refreshRemoteBranch(
        target,
        execGit,
        configuredTrackingBranch.remoteName,
        configuredTrackingBranch.remoteBranch
      );
      return configuredTrackingBranch;
    }
  } catch {
    // Resolve a same-named remote branch below when no upstream is configured.
  }

  const { stdout: remotesStdout } = await execGit(target, ["remote"], 64 * 1024);
  const remotes = remotesStdout
    .split(/\r?\n/)
    .map((remote) => remote.trim())
    .filter(Boolean)
    .sort((left, right) => Number(right === "origin") - Number(left === "origin"));

  for (const remoteName of remotes) {
    await refreshRemoteBranch(target, execGit, remoteName, branch);
    if (await remoteBranchExists(target, execGit, remoteName, branch)) {
      return {
        configured: false,
        remoteName,
        remoteBranch: branch,
        ref: `${remoteName}/${branch}`
      };
    }
  }

  return null;
}

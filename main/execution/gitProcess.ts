import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function isNotGitRepository(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === 128 && "stderr" in error
    && typeof error.stderr === "string" && error.stderr.includes("not a git repository");
}

const workspaceGitArgs = (path: string, args: readonly string[]): string[] => ["--no-optional-locks", "-C", path, ...args];
const workspaceGitOptions = () => ({
  windowsHide: true, timeout: 10_000, maxBuffer: 2 * 1024 * 1024,
  env: { ...process.env, LC_ALL: "C", GIT_DIR: undefined, GIT_WORK_TREE: undefined,
    GIT_COMMON_DIR: undefined, GIT_INDEX_FILE: undefined }
});

/** Read-only inspection must neither refresh the user's index nor inherit another Git root. */
export function runWorkspaceGit(executable: string, path: string, args: readonly string[]) {
  return execFileAsync(executable, workspaceGitArgs(path, args), workspaceGitOptions());
}

/** Same isolation as `runWorkspaceGit`, keeping stdout as raw bytes for object contents. */
export async function runWorkspaceGitBytes(executable: string, path: string, args: readonly string[]): Promise<Buffer> {
  return (await execFileAsync(executable, workspaceGitArgs(path, args), { ...workspaceGitOptions(), encoding: "buffer" })).stdout;
}

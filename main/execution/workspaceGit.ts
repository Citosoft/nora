import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CheckoutInspection } from "@main/types/execution/workspace.types";

const execFileAsync = promisify(execFile);

/** Local process implementation; remote execution supplies its own filesystem owner. */
export function createCheckoutInspector(executable: string): (path: string) => Promise<CheckoutInspection> {
  return async (path) => {
    const run = (args: string[]) => execFileAsync(executable, ["-C", path, ...args], { windowsHide: true, timeout: 10_000, maxBuffer: 1024 * 1024,
      env: { ...process.env, LC_ALL: "C", GIT_DIR: undefined, GIT_WORK_TREE: undefined, GIT_COMMON_DIR: undefined, GIT_INDEX_FILE: undefined } });
    let rootPath: string;
    try { rootPath = (await run(["rev-parse", "--show-toplevel"])).stdout.replace(/\r?\n$/, ""); }
    catch (error) {
      if (error instanceof Error && "code" in error && error.code === 128 && "stderr" in error
        && typeof error.stderr === "string" && error.stderr.includes("not a git repository")) return { rootPath: path, branch: "" };
      throw error;
    }
    try { return { rootPath, branch: (await run(["symbolic-ref", "--quiet", "--short", "HEAD"])).stdout.replace(/\r?\n$/, "") }; }
    catch (error) {
      if (error instanceof Error && "code" in error && error.code === 1) return { rootPath, branch: "" }; // Detached HEAD.
      throw error;
    }
  };
}

import type { CheckoutInspection } from "@main/types/execution/workspace.types";
import { isNotGitRepository, runWorkspaceGit } from "./gitProcess";

/** Local process implementation; remote execution supplies its own filesystem owner. */
export function createCheckoutInspector(executable: string): (path: string) => Promise<CheckoutInspection> {
  return async (path) => {
    const run = (args: string[]) => runWorkspaceGit(executable, path, args);
    let rootPath: string;
    try { rootPath = (await run(["rev-parse", "--show-toplevel"])).stdout.replace(/\r?\n$/, ""); }
    catch (error) {
      if (isNotGitRepository(error)) return { rootPath: path, branch: "", versionControl: "none" };
      throw error;
    }
    try { return { rootPath, branch: (await run(["symbolic-ref", "--quiet", "--short", "HEAD"])).stdout.replace(/\r?\n$/, ""), versionControl: "git" }; }
    catch (error) {
      if (error instanceof Error && "code" in error && error.code === 1) return { rootPath, branch: "", versionControl: "git" }; // Detached HEAD.
      throw error;
    }
  };
}

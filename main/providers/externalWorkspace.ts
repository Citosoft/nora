import { realpath } from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";

/** Include subdirectories without confusing sibling checkouts or paths with the same prefix. */
export async function isExternalWorkspace(cwd: string, workspacePath: string): Promise<boolean> {
  if (!isAbsolute(cwd)) return false;
  try {
    const [sessionPath, root] = await Promise.all([realpath(cwd), realpath(workspacePath)]);
    const suffix = relative(root, sessionPath);
    return suffix === "" || (!isAbsolute(suffix) && suffix !== ".." && !suffix.startsWith(`..${sep}`));
  } catch { return false; }
}

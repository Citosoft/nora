import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { findVersionInText } from "@main/helpers/semanticVersion";
import { buildProcessEnv } from "@main/processEnv";
import type { ResolveVersion } from "@main/types/providerUpdates.types";

const execFileAsync = promisify(execFile);
const VERSION_TIMEOUT_MS = 10_000;

/** Runs `<executable> --version` and extracts the semantic version; failures resolve to `null`. */
export const readCliVersion: ResolveVersion = async (executablePath) => {
  try {
    const { stdout } = await execFileAsync(executablePath, ["--version"], {
      env: buildProcessEnv(process.env),
      timeout: VERSION_TIMEOUT_MS,
      windowsHide: true,
      // npm installs Windows shims as `.cmd`, which only run through a shell.
      shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(executablePath)
    });
    return findVersionInText(stdout);
  } catch {
    return null;
  }
};

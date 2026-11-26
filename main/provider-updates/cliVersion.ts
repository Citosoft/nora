import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { commandLaunch } from "@main/helpers/commandLaunch";
import { findVersionInText } from "@main/helpers/semanticVersion";
import { buildProcessEnv } from "@main/processEnv";
import type { ResolveVersion } from "@main/types/providerUpdates.types";

const execFileAsync = promisify(execFile);
const VERSION_TIMEOUT_MS = 10_000;

/** Runs `<executable> --version` and extracts the semantic version; failures resolve to `null`. */
export const readCliVersion: ResolveVersion = async (executablePath) => {
  try {
    const launch = commandLaunch(executablePath, ["--version"]);
    const { stdout } = await execFileAsync(launch.command, launch.args, {
      env: buildProcessEnv(process.env),
      timeout: VERSION_TIMEOUT_MS,
      windowsHide: true,
      windowsVerbatimArguments: launch.windowsVerbatimArguments
    });
    return findVersionInText(stdout);
  } catch {
    return null;
  }
};

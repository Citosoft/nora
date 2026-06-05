import { APP_GITHUB_REPOSITORY_SLUG } from "@shared/appMeta";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildProcessEnv } from "./processEnv";
import { findExecutableOnPath } from "./processLookup";

const execFileAsync = promisify(execFile);

async function findGhExecutable(): Promise<string | null> {
  const isWindows = process.platform === "win32";
  return findExecutableOnPath(isWindows ? ["gh.exe", "gh"] : ["gh"], isWindows);
}

export { findGhExecutable };

function isHttp404(message: string): boolean {
  return message.includes("HTTP 404");
}

export async function checkAppRepositoryStarred(): Promise<boolean | null> {
  const ghExecutable = await findGhExecutable();
  if (!ghExecutable) {
    return null;
  }

  try {
    await execFileAsync(ghExecutable, ["api", `user/starred/${APP_GITHUB_REPOSITORY_SLUG}`], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
      env: buildProcessEnv(process.env)
    });
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (isHttp404(message)) {
      return false;
    }

    return null;
  }
}

export async function starAppRepository(): Promise<boolean> {
  const ghExecutable = await findGhExecutable();
  if (!ghExecutable) {
    return false;
  }

  try {
    await execFileAsync(ghExecutable, ["api", "-X", "PUT", `user/starred/${APP_GITHUB_REPOSITORY_SLUG}`], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
      env: buildProcessEnv(process.env)
    });
    return true;
  } catch {
    return false;
  }
}

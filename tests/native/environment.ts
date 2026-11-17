import { execFile } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { AcceptanceConfig, AcceptanceEnvironment } from "./types/acceptance.types";

const execFileAsync = promisify(execFile);

/** Only the explicitly selected credential is admitted; profiles/hooks/history stay isolated. */
export async function prepareEnvironment(config: AcceptanceConfig): Promise<AcceptanceEnvironment> {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "nora-native-acceptance-")));
  try {
    const workspacePath = join(directory, "workspace"); const nativeHome = join(directory, "native-home");
    await mkdir(nativeHome, { mode: 0o700 });
    await execFileAsync("git", ["init", "-b", "acceptance", workspacePath]);
    await writeFile(join(workspacePath, "note.md"), "Pre-existing acceptance note\n");
    const environment: NodeJS.ProcessEnv = {};
    for (const name of ["OPENAI_API_KEY", "CODEX_API_KEY", "ACCESS_TOKEN", "ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_AUTH_TOKEN",
      "ANTHROPIC_BASE_URL", "OPENAI_BASE_URL", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CODE_USE_FOUNDRY"]) environment[name] = undefined;
    if (config.provider === "codex") {
      environment.CODEX_HOME = nativeHome;
      environment.OPENAI_API_KEY = config.scenario === "signed-out" ? undefined : process.env.OPENAI_API_KEY;
      if (config.authFile && config.scenario !== "signed-out") { await copyFile(config.authFile, join(nativeHome, "auth.json")); await chmod(join(nativeHome, "auth.json"), 0o600); }
    } else { environment.CLAUDE_CONFIG_DIR = nativeHome; environment.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; }
    return { directory, workspacePath,
      selection: { projectId: "acceptance", environmentId: "acceptance", checkoutId: "registered", path: workspacePath, branch: "acceptance", access: "write" },
      options: { databasePath: join(directory, "state", "execution.sqlite"), environmentId: "acceptance", gitExecutable: "git",
        registrations: () => [{ projectId: "acceptance", checkoutId: "registered", path: workspacePath }], shutdownGraceMs: 5000,
        onFailure() { /* The observer reports failure without printing diagnostics or credentials. */ },
        instances: config.provider === "codex"
          ? [{ kind: "codex", options: { instanceId: "acceptance", executable: config.executable,
            arguments: ["-C", workspacePath, ...(config.scenario === "question" ? ["--enable", "default_mode_request_user_input"] : []),
              "app-server", "--listen", "stdio://"], environment,
            policies: { acceptance: { approvalPolicy: config.scenario === "approval" ? "untrusted" : "on-request",
              sandbox: config.scenario === "approval" ? "read-only" : "workspace-write" } } } }]
          : [{ kind: "claude", instanceId: "acceptance", runtime: { executablePath: config.executable, environment }, policies: { acceptance: "default" } }]
      }
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

import { getShell, getShellArgs } from "@main/orchestrator/shell";
import type {
  ExecuteLoopHeadlessCommandHandle,
  ExecuteLoopHeadlessCommandInput,
  LoopHeadlessExecutor
} from "@main/types/loopHeadlessExecutor.types";
import { buildProcessEnv } from "@main/processEnv";
import { spawn } from "node:child_process";

function terminateProcessTree(child: ReturnType<typeof spawn>): void {
  if (!child.pid) {
    child.kill();
    return;
  }
  if (process.platform === "win32") {
    const taskkill = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      windowsHide: true,
      stdio: "ignore"
    });
    taskkill.on("error", () => child.kill());
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
    const forceKill = setTimeout(() => {
      if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, 1_000);
    forceKill.unref();
  } catch {
    child.kill();
  }
}

export function createLoopHeadlessExecutor(): LoopHeadlessExecutor {
  return {
    execute(input: ExecuteLoopHeadlessCommandInput): ExecuteLoopHeadlessCommandHandle {
      let settled = false;
      let output = "";
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let child: ReturnType<typeof spawn> | null = null;
      let aborted = false;

      const result = new Promise<{ output: string; exitCode: number | null; aborted: boolean }>((resolve, reject) => {
        const finish = (value?: { output: string; exitCode: number | null; aborted: boolean }, error?: Error): void => {
          if (settled) {
            return;
          }
          settled = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          if (error) {
            reject(error);
            return;
          }
          resolve(value ?? { output, exitCode: null, aborted });
        };

        child = spawn(getShell(), getShellArgs(input.command), {
          cwd: input.cwd,
          env: buildProcessEnv(process.env, input.env),
          detached: process.platform !== "win32",
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"]
        });

        const forward = (chunk: Buffer | string): void => {
          const text = chunk.toString();
          output = `${output}${text}`.slice(-500_000);
          input.onOutput(text);
        };

        child.stdout?.on("data", forward);
        child.stderr?.on("data", forward);
        child.on("error", (error) => finish(undefined, error instanceof Error ? error : new Error(String(error))));
        child.on("close", (exitCode) => finish({ output, exitCode, aborted }));

        timeoutId = setTimeout(() => {
          if (child) terminateProcessTree(child);
          finish(undefined, new Error("Workflow agent turn timed out."));
        }, input.timeoutMs);
      });

      return {
        abort: () => {
          if (settled || aborted) return;
          aborted = true;
          if (child) terminateProcessTree(child);
        },
        result
      };
    }
  };
}

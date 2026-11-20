import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { buildProcessEnv } from "@main/processEnv";
import type { SecretCommandRunner } from "@main/types/secrets/secrets.types";

/** Collected output is capped so a runaway command cannot exhaust memory; the newest output is what gets kept. */
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const FORCE_KILL_AFTER_MS = 2000;

/** Stops the shell and everything it started: the process group on POSIX, the process tree on Windows. */
function stopTree(child: ChildProcess, force: boolean): void {
  if (child.pid === undefined) return;
  try {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("error", () => undefined);
    else process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
  } catch { /* It already exited. */ }
}

/**
 * Runs one shell command (sh, or cmd.exe on Windows) with extra environment variables that exist only for that process, so a
 * secret reaches the command without being written to disk or passed as an argument other processes could read.
 */
export const runSecretCommand: SecretCommandRunner = ({ command, cwd, env, timeoutMs, signal }) => new Promise((resolve, reject) => {
  const child = spawn(command, { shell: true, cwd, env: buildProcessEnv(process.env, { ...env }), windowsHide: true,
    detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
  const chunks: Buffer[] = [];
  let size = 0;
  let timedOut = false;
  const collect = (chunk: Buffer): void => {
    chunks.push(chunk); size += chunk.length;
    while (size > MAX_OUTPUT_BYTES && chunks.length > 1) size -= chunks.shift()?.length ?? 0;
  };
  const stop = (): void => { stopTree(child, false); setTimeout(() => stopTree(child, true), FORCE_KILL_AFTER_MS).unref(); };
  const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
  const done = (): void => { clearTimeout(timer); signal.removeEventListener("abort", stop); };
  signal.addEventListener("abort", stop, { once: true });
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  child.once("error", (error) => { done(); reject(new Error(`The command could not be started: ${error.message}`)); });
  child.once("close", (exitCode) => { done(); resolve({ exitCode, output: Buffer.concat(chunks).toString("utf8"), timedOut }); });
});

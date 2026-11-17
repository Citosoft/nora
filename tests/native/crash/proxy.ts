import { spawn } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { rpcMessageSchema, turnSchema } from "@main/providers/codex/rpcSchemas";
import { readThreadSchema } from "@main/providers/codex/nativeSchemas";
import type { CrashAudit } from "../types/crash.types";

// Only method names/lifecycle markers are recorded. Never log params, replies or credentials.
const [auditPath, controlPath, mode, executable, ...args] = process.argv.slice(2);
if (!auditPath || !controlPath || !executable || !["host-crash", "provider-crash", "recovery"].includes(mode)) throw new Error("Invalid crash proxy setup");
const instance = randomUUID();
const record = (event: CrashAudit["event"], method?: string, outcomes?: CrashAudit["outcomes"]): void => {
  appendFileSync(auditPath, `${JSON.stringify({ instance, event, ...(method ? { method } : {}), ...(outcomes ? { outcomes } : {}) })}\n`, { mode: 0o600 });
};
record("proxy-start");
if (process.platform === "win32") throw new Error("Crash proxy process-group supervision requires POSIX acceptance");
// A separate, owned process group also contains CLI launchers and their native child binaries.
const native = spawn(executable, args, { env: process.env, stdio: "pipe", detached: true });
const requests = new Map<string | number, string>();
const callbacks = new Map<string | number, string>();
let withholding = false; let accepted = false;
const stop = (): void => {
  if (native.pid && native.exitCode === null && native.signalCode === null) {
    try { process.kill(-native.pid, "SIGKILL"); } catch { native.kill("SIGKILL"); }
  }
};
const timer = setInterval(() => { if (existsSync(controlPath)) stop(); }, 25);
native.stderr.resume();
native.stdin.on("error", stop);
native.on("error", () => { record("native-error"); clearInterval(timer); process.exit(1); });
process.stdout.on("error", stop);
process.stdin.on("end", stop);
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
createInterface({ input: process.stdin }).on("line", (line) => {
  try {
    const message = rpcMessageSchema.parse(JSON.parse(line));
    if (message.method) {
      record("client-request", message.method);
      if (message.id !== undefined) requests.set(message.id, message.method);
      if (message.method === "turn/start" && mode === "host-crash") withholding = true;
    } else if (message.id !== undefined) record("client-response", callbacks.get(message.id));
    native.stdin.write(`${line}\n`, (error) => { if (error) stop(); });
  } catch { stop(); }
});
createInterface({ input: native.stdout }).on("line", (line) => {
  try {
    const message = rpcMessageSchema.parse(JSON.parse(line));
    const method = message.id === undefined ? undefined : requests.get(message.id);
    if (!accepted && (message.method === "turn/started" || (method === "turn/start" && turnSchema.safeParse(message.result).success))) {
      accepted = true; record("native-turn-accepted");
    }
    if (message.method === "turn/completed") record("native-turn-completed");
    if (message.method && message.id !== undefined) { callbacks.set(message.id, message.method); record("native-request", message.method); }
    if (method === "thread/read" && (message.result !== undefined || message.error !== undefined)) {
      const history = readThreadSchema.safeParse(message.result);
      const outcomes: NonNullable<CrashAudit["outcomes"]> = history.success ? history.data.thread.turns.map((turn) =>
        turn.status === "inProgress" || turn.status === "completed" || turn.status === "failed" || turn.status === "interrupted" ? turn.status : "unsupported") : [];
      record("native-history-read", undefined, outcomes);
    }
    if (!withholding) process.stdout.write(`${line}\n`);
  } catch { stop(); }
});
native.on("close", () => {
  record("native-exit"); clearInterval(timer); process.stdin.destroy();
  if (process.stdout.destroyed) process.exit(0);
  process.stdout.end(() => process.exit(0));
});

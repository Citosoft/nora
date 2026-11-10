import { fork } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CrashAudit, CrashConfig, CrashWorker } from "../types/crash.types";
import { auditSchema, workerMessageSchema } from "./schema";

export function readAudit(path: string): CrashAudit[] {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  return text.slice(0, text.lastIndexOf("\n") + 1).split("\n").filter(Boolean).map((line) => auditSchema.parse(JSON.parse(line)));
}

export function startWorker(config: CrashConfig): CrashWorker {
  const child = fork(join(__dirname, "worker.js"), [], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
  const messages: CrashWorker["messages"] = [];
  const closed = new Promise<void>((resolve) => { child.once("close", () => resolve()); });
  child.stdout?.resume(); child.stderr?.resume();
  child.on("message", (input: unknown) => {
    const parsed = workerMessageSchema.safeParse(input);
    messages.push(parsed.success ? parsed.data : { kind: "failed" });
  });
  child.send({ kind: "start", config });
  return { process: child, messages, closed, async stop() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (child.connected) child.send({ kind: "stop" }, () => {});
      await Promise.race([closed, new Promise<void>((resolve) => { timer = setTimeout(resolve, 5000); })]);
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      await closed;
    } finally { clearTimeout(timer); }
  } };
}

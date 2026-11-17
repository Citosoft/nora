import { openLocalHost } from "@main/execution/localHost";
import type { ExecutionHost } from "@main/execution/host";
import type { CrashMessage } from "../types/crash.types";
import { workerCommandSchema } from "./schema";
import { crashHostOptions } from "./options";
import { crashCommands } from "./commands";

let host: ExecutionHost | null = null;
let stopWatch = (): void => {};
let started = false;
const send = (message: CrashMessage): void => { if (process.connected) process.send?.(message, () => {}); };
const stop = async (): Promise<void> => { stopWatch(); if (host) await host.shutdown(); if (process.connected) process.disconnect(); };
process.on("disconnect", () => { void stop().catch(() => { process.exitCode = 1; }); });
process.on("message", (input: unknown) => {
  void (async () => {
    const command = workerCommandSchema.parse(input);
    if (command.kind === "stop") { await stop(); return; }
    if (started) throw new Error("Crash worker already started");
    started = true;
    const config = command.config;
    host = await openLocalHost(crashHostOptions(config));
    stopWatch = host.subscribe({ after: 0, onError() {}, onEvent(event) {
      if (event.payload.kind !== "run" || event.payload.run.id !== "crash-active") return;
      const run = event.payload.run;
      send({ kind: "state", state: run.state, nativeTurnKnown: run.nativeTurnId !== null,
        pendingRequest: (host?.header("acceptance")?.pendingRequests.length ?? 0) > 0 });
    } });
    await host.execute({ kind: "create", commandId: "create", conversationId: "acceptance", title: "Crash acceptance", parentId: null,
      workspace: { projectId: "acceptance", environmentId: "acceptance", checkoutId: "registered", path: config.workspacePath, branch: "acceptance", access: "write" },
      provider: { kind: "codex", instanceId: "acceptance", model: config.model, reasoning: config.reasoning, permissionPolicy: "acceptance" } });
    const [active, queued] = crashCommands(config.mode === "provider-crash");
    const activeReceipt = await host.execute(active); const queuedReceipt = await host.execute(queued);
    send({ kind: "ready", activeReceipt, queuedReceipt });
  })().catch(async () => { send({ kind: "failed" }); await stop().catch(() => {}); process.exitCode = 1; });
});

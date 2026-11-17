import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CodexAdapter } from "@main/providers/codex/adapter";
import type { AcceptanceConfig, AcceptanceEnvironment, AcceptanceReport } from "../types/acceptance.types";
import type { CrashConfig } from "../types/crash.types";
import { readAudit, startWorker } from "./process";
import { verifyRecovery } from "./recover";
import { until } from "../observe";

export async function crashAcceptance(config: AcceptanceConfig, environment: AcceptanceEnvironment, report: AcceptanceReport): Promise<void> {
  if (config.provider !== "codex" || process.platform === "win32") {
    report.checks.push({ name: "crash-acceptance", status: "unverified", detail: "requires-local-POSIX-Codex-runtime" }); return;
  }
  const instance = environment.options.instances[0]; assert.ok(instance?.kind === "codex");
  const adapter = new CodexAdapter({ ...instance.options, now: () => new Date().toISOString() });
  const catalog = await adapter.catalog(environment.selection);
  await adapter.close();
  if (catalog.status !== "available") throw new Error("Crash acceptance catalog unavailable");
  if (catalog.catalog.authentication !== "present") {
    report.checks.push({ name: "authenticated-lifecycle", status: "unverified", detail: "provider-authentication-required" }); return;
  }
  const model = config.model ? catalog.catalog.models.find((entry) => entry.id === config.model) : catalog.catalog.models[0]; assert.ok(model);
  report.model = model.id;
  const crash: CrashConfig = { mode: config.scenario === "host-crash" ? "host-crash" : "provider-crash",
    workspacePath: environment.workspacePath, databasePath: environment.options.databasePath,
    executable: instance.options.executable, arguments: instance.options.arguments ?? ["app-server", "--listen", "stdio://"],
    environment: Object.fromEntries(Object.entries(instance.options.environment ?? {}).map(([key, value]) => [key, value ?? null])),
    auditPath: join(environment.directory, "rpc-audit.jsonl"), controlPath: join(environment.directory, "kill-provider"),
    model: model.id, reasoning: model.reasoningEfforts.includes("low") ? "low" : null };
  const worker = startWorker(crash);
  try {
    await until(() => worker.messages.some((message) => message.kind === "ready" || message.kind === "failed"));
    const ready = worker.messages.find((message) => message.kind === "ready"); assert.ok(ready?.kind === "ready");
    if (crash.mode === "host-crash") {
      await until(() => readAudit(crash.auditPath).some((entry) => entry.event === "native-turn-accepted"));
      assert.equal(worker.messages.some((message) => message.kind === "state" && message.nativeTurnKnown), false);
      assert.equal(worker.process.kill("SIGKILL"), true); await worker.closed;
    } else {
      await until(() => worker.messages.some((message) => message.kind === "state" && message.state === "awaiting-approval" && message.pendingRequest));
      await writeFile(crash.controlPath, "kill-owned-provider\n", { mode: 0o600 });
      await until(() => worker.messages.some((message) => message.kind === "state" && message.state === "recovering"));
      await worker.stop();
    }
    await until(() => readAudit(crash.auditPath).some((entry) => entry.event === "native-exit"));
    assert.equal(readAudit(crash.auditPath).some((entry) => entry.event === "native-turn-completed"), false);
    await rm(crash.controlPath, { force: true });
    report.checks.push({ name: crash.mode, status: "passed", detail: crash.mode === "host-crash"
      ? "host-SIGKILL-after-native-acceptance-before-turn-id-delivery" : "provider-group-SIGKILL-with-unanswered-native-approval" });
    await verifyRecovery(crash, ready, report.checks);
  } finally { await worker.stop(); }
}

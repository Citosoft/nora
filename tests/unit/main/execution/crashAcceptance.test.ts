import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { prepareEnvironment } from "../../../native/environment";
import { crashAcceptance } from "../../../native/crash/run";
import type { AcceptanceConfig, AcceptanceReport } from "../../../native/types/acceptance.types";

for (const scenario of ["host-crash", "provider-crash"] as const) {
  test(`process acceptance validates ${scenario} using only a deterministic native fixture`, { skip: process.platform === "win32" }, async () => {
    const config: AcceptanceConfig = { provider: "codex", scenario, executable: process.execPath, reportPath: "unused" };
    const environment = await prepareEnvironment(config);
    try {
      const instance = environment.options.instances[0]; assert.ok(instance.kind === "codex");
      environment.options.instances = [{ kind: "codex", options: { ...instance.options, executable: process.execPath,
        arguments: [join(process.cwd(), "tests/unit/main/execution/fixtures/codexServer.cjs")],
        environment: { ...instance.options.environment, OPENAI_API_KEY: undefined, NORA_CODEX_FIXTURE_MODE: scenario === "host-crash" ? "hold" : "crash-known" } } }];
      const report: AcceptanceReport = { provider: "codex", scenario, runtime: "deterministic fixture", model: null,
        outcome: "partial", checkedAt: new Date().toISOString(), checks: [], workspaceRemoved: false };
      await crashAcceptance(config, environment, report);
      assert.ok(report.checks.some((check) => check.name === "no-blind-resubmission"));
      assert.ok(report.checks.every((check) => check.status === "passed"));
      if (scenario === "provider-crash") assert.ok(report.checks.some((check) => check.name === "expired-approval"));
    } finally { await rm(environment.directory, { recursive: true, force: true }); }
  });
}

import assert from "node:assert/strict";
import { openLocalHost } from "@main/execution/localHost";
import { SqliteExecutionStore } from "@main/execution/sqliteStore";
import type { CrashConfig, CrashMessage } from "../types/crash.types";
import type { AcceptanceCheck } from "../types/acceptance.types";
import { crashHostOptions } from "./options";
import { crashCommands } from "./commands";
import { readAudit } from "./process";
import { until } from "../observe";

/** Recovery must read native state, retain the original attempt and never issue another start. */
export async function verifyRecovery(config: CrashConfig, ready: Extract<CrashMessage, { kind: "ready" }>, checks: AcceptanceCheck[]): Promise<void> {
  const before = new SqliteExecutionStore(config.databasePath, "acceptance");
  const { saved, previousOwner } = (() => {
    try { return { saved: before.snapshot("acceptance"), previousOwner: before.ownership() }; }
    finally { before.close(); }
  })();
  assert.ok(saved);
  const active = saved.runs.find((run) => run.id === "crash-active"); assert.ok(active);
  const queued = saved.runs.find((run) => run.id === "crash-queued"); assert.ok(queued);
  assert.equal(queued.state, "queued"); assert.equal(saved.runs.length, 2);
  if (config.mode === "host-crash") { assert.ok(previousOwner); assert.equal(active.nativeTurnId, null); }
  else { assert.ok(active.nativeTurnId); assert.ok(saved.requests.some((request) => request.status === "expired")); }
  const historyReads = readAudit(config.auditPath).filter((entry) => entry.event === "native-history-read").length;
  const host = await openLocalHost(crashHostOptions(config, true));
  try {
    await until(() => readAudit(config.auditPath).filter((entry) => entry.event === "native-history-read").length > historyReads);
    // Allow the host to commit the response or conservative uncertainty after the native read.
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    const page = host.conversationHistory({ conversationId: "acceptance", scope: "runs", limit: 20 }); assert.ok(page.scope === "runs");
    const recovered = page.runs.find((run) => run.id === active.id); assert.ok(recovered);
    const retained = page.runs.find((run) => run.id === queued.id); assert.ok(retained);
    assert.equal(recovered.attemptId, active.attemptId); assert.equal(recovered.nativeTurnId, active.nativeTurnId);
    assert.equal(host.header("acceptance")?.conversation.nativeConversationId, saved.conversation.nativeConversationId);
    if (config.mode === "host-crash") assert.equal(recovered.state, "recovering");
    else {
      assert.ok(["recovering", "interrupted", "failed"].includes(recovered.state));
      if (recovered.state !== "recovering") assert.ok(readAudit(config.auditPath).some((entry) =>
        entry.event === "native-history-read" && entry.outcomes?.includes(recovered.state === "failed" ? "failed" : "interrupted")));
    }
    assert.equal(retained.state, "queued");
    assert.equal(retained.instruction, queued.instruction); assert.equal(page.runs.length, 2);
    const [activeCommand, queuedCommand] = crashCommands(config.mode === "provider-crash");
    assert.deepEqual(await host.execute(activeCommand), ready.activeReceipt);
    assert.deepEqual(await host.execute(queuedCommand), ready.queuedReceipt);
    for (const request of saved.requests) {
      const option = request.kind === "approval" ? request.options[0] : null;
      if (!option) continue;
      await assert.rejects(host.execute({ kind: "respond", commandId: `stale:${request.id}`, conversationId: "acceptance",
        requestId: request.id, response: { kind: "approval", optionId: option.id } }), /no longer answerable/);
    }
    assert.equal(readAudit(config.auditPath).filter((entry) => entry.event === "client-request" && entry.method === "turn/start").length, 1);
    assert.equal(readAudit(config.auditPath).filter((entry) => entry.event === "client-response" && entry.method?.endsWith("requestApproval")).length, 0);
    checks.push({ name: "recovery-preserves-native-identity", status: "passed", detail: "same-conversation-run-attempt-and-native-binding" },
      { name: "no-blind-resubmission", status: "passed", detail: "one-total-native-turn-start-before-and-after-recovery" },
      { name: "queued-intent-and-receipts", status: "passed", detail: "queued-message-and-original-command-receipts-preserved" });
    if (saved.requests.length) checks.push({ name: "expired-approval", status: "passed", detail: "stale-response-rejected-without-native-delivery" });
    assert.equal((await host.shutdown()).unconfirmedRuns.length, recovered.state === "recovering" ? 1 : 0);
  } finally { await host.shutdown(); }
  const after = new SqliteExecutionStore(config.databasePath, "acceptance");
  try {
    const checkpoint = after.checkpoint("acceptance", "crash-active");
    assert.ok(checkpoint?.baseline.status === "ready"); assert.equal(checkpoint.continuity, "interrupted");
    assert.equal(after.checkpoint("acceptance", "crash-queued"), null); assert.equal(after.ownership(), null);
    checks.push({ name: "checkpoint-boundary", status: "passed", detail: "baseline-retained-attribution-invalidated-and-queue-never-captured" });
  } finally { after.close(); }
}

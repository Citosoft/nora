import { CodexAdapter } from "@main/providers/codex/adapter";
import type { ProviderExecution, ProviderUpdate } from "@main/types/execution/provider.types";
import type { LocalHostOptions } from "@main/types/execution/localHost.types";
import type { AcceptanceCheck } from "./types/acceptance.types";

/** Read a real persisted native turn after transport shutdown; this sends no new instruction. */
export async function readNativeOutcome(options: LocalHostOptions, execution: ProviderExecution, checks: AcceptanceCheck[]): Promise<void> {
  const instance = options.instances.find((entry) => entry.kind === "codex");
  if (!instance || instance.kind !== "codex") return;
  const adapter = new CodexAdapter({ ...instance.options, now: () => new Date().toISOString() });
  const updates: ProviderUpdate[] = [];
  try {
    await adapter.reconcile(execution, (update) => updates.push(update));
    checks.push({ name: "exact-native-turn-read", status: updates.some((update) => update.kind === "finished" && update.status === "completed"
      && update.runId === execution.run.id && update.attemptId === execution.run.attemptId) ? "passed" : "failed", detail: "read-only-no-resubmission" });
  } catch {
    checks.push({ name: "exact-native-turn-read", status: "failed", detail: "native-history-reconciliation-unavailable" });
  } finally { await adapter.close(); }
}

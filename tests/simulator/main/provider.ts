import { setTimeout as delay } from "node:timers/promises";
import type { ExecutionProvider, EmitProviderUpdate, ProviderExecution } from "@main/types/execution/provider.types";
import type { ExecutionFailure, RequestResponse, RuntimeRequest, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { SimulatorExecution, SimulatorStep } from "../types/scenarios.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { normalizeCodexTool } from "@main/providers/codex/toolActivity";
import { stepsForScenario } from "../scenarios";
import { simulatorPacing } from "../pacing";
import type { SteeringResult } from "@main/types/execution/steering.types";

/** Deliberately has no SDK, subprocess, filesystem-tool or network implementation. */
export class SimulatorProvider implements ExecutionProvider {
  readonly kind = "codex";
  readonly instanceId = "simulator";
  readonly capabilities = { ...nativeCapabilities, steering: true };
  private readonly active = new Map<string, SimulatorExecution>();
  private sequence = 0;
  constructor(private readonly speed = 1) {}

  async catalog(): Promise<ProviderCatalogResult> {
    return { status: "available" as const, catalog: { kind: this.kind, instanceId: this.instanceId, capabilities: this.capabilities,
      authentication: "present" as const, models: [{ id: "simulated", name: "Simulated model · no tokens", description: "Local scripted responses", reasoningEfforts: [], defaultReasoningEffort: null }],
      policies: [{ id: "simulated", label: "Simulated permissions" }] } };
  }

  async start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const active: SimulatorExecution = { ...execution, emit, controller: new AbortController(), done: false, tools: new Map() };
    this.active.set(execution.run.attemptId, active);
    const base = this.base(active);
    emit({ ...base, kind: "started", nativeConversationId: `simulated-${execution.snapshot.conversation.id}`, nativeTurnId: `turn-${execution.run.id}` });
    try {
      if (!await this.pause(active, simulatorPacing.firstResponseMs)) return;
      this.item(active, { id: `${active.run.id}:reasoning`, runId: active.run.id, createdAt: new Date().toISOString(), kind: "reasoning", text: "Example reasoning summary for testing the expandable UI.", complete: true });
      for (const step of stepsForScenario(execution.run.instruction)) {
        if (active.done) break;
        if (step.kind !== "pause" && !await this.pause(active, simulatorPacing.actionGapMs)) break;
        switch (step.kind) {
          case "pause": await this.pause(active, step.milliseconds); break;
          case "text": await this.text(active, step.text); break;
          case "display": this.item(active, { ...step.item, id: `${active.run.id}:${step.id}`, runId: active.run.id, createdAt: new Date().toISOString() }); break;
          case "tool": {
            const native = step.native;
            const nativeId = native !== null && typeof native === "object" && !Array.isArray(native) && typeof native.id === "string" ? native.id : "tool";
            const id = `${active.run.id}:${nativeId}`;
            const previous = active.tools.get(id);
            const item = normalizeCodexTool(native, { id, runId: active.run.id, createdAt: previous?.createdAt ?? new Date().toISOString() }, step.complete, previous);
            if (item) {
              if (step.complete) {
                if (!previous) {
                  const running = { ...item, state: "running" as const, output: "", details: item.details ? { ...item.details, durationMs: undefined, exitCode: undefined } : undefined };
                  active.tools.set(id, running); this.item(active, running);
                }
                if (!await this.pause(active, simulatorPacing.toolRunMs)) break;
              }
              active.tools.set(id, item); this.item(active, item);
            }
            break;
          }
          case "questions":
          case "approval": await this.ask(active, step); break;
          case "failure": this.finish(active, "failed", step.failure?.code === "usage-limit"
            ? { ...step.failure, resetsAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString() } : step.failure); break;
          case "recovery":
            emit({ ...this.base(active), kind: "disconnected", failure: { code: "disconnected", message: "Simulated connection loss. Use Check native status to recover.", retryable: false } });
            await this.waitForStop(active); break;
        }
      }
      if (!active.done) { await this.text(active, "Simulation complete. No LLM requests were made and no commands were executed."); this.finish(active, "completed"); }
    } finally {
      this.active.delete(execution.run.attemptId);
    }
  }

  private async ask(active: SimulatorExecution, step: Extract<SimulatorStep, { kind: "questions" | "approval" }>): Promise<void> {
    const id = `${active.run.id}:request:${++this.sequence}`;
    const expires = step.kind === "questions" && step.expire;
    const common = { id, runId: active.run.id, attemptId: active.run.attemptId, nativeId: id, status: "pending" as const,
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + (expires ? simulatorPacing.requestExpiryMs : 30 * 60_000)).toISOString() };
    const request: RuntimeRequest = step.kind === "questions" ? { ...common, kind: "question", title: "Choose your preferences", questions: step.questions }
      : { ...common, kind: "approval", title: step.title, details: step.details, options: step.options };
    const answer = new Promise<RequestResponse | null>((resolve) => { active.response = resolve; });
    active.emit({ ...this.base(active), kind: "request", request });
    if (expires) {
      await delay(simulatorPacing.requestExpiryMs + 100, undefined, { signal: active.controller.signal }).catch(() => {});
      if (!active.done && active.response) {
        active.emit({ ...this.base(active), kind: "request-expired", requestId: id });
        await this.waitForStop(active);
      }
    }
    const response = await answer;
    if (response?.kind === "question") await this.text(active, `You selected:\n${Object.entries(response.answers).map(([key, values]) => `- **${key}**: ${values.join(", ")}`).join("\n")}`);
    else if (response?.kind === "approval") {
      if (response.optionId === "cancel") this.finish(active, "interrupted");
      else await this.text(active, response.optionId === "deny" ? "The simulated action was declined. Continuing without it." : `Approval received: **${response.optionId}**. Simulating the action.`);
    }
  }

  async respond(execution: ProviderExecution, request: RuntimeRequest, response: RequestResponse): Promise<void> {
    const active = this.active.get(execution.run.attemptId);
    if (!active?.response) throw new Error("No simulated request is pending");
    active.emit({ ...this.base(active), kind: "request-resolved", requestId: request.id });
    const resolve = active.response; active.response = undefined; resolve(response);
  }
  async steer(execution: ProviderExecution, _instruction: string): Promise<SteeringResult> {
    const active = this.active.get(execution.run.attemptId);
    return active && !active.done ? { status: "accepted" } : { status: "rejected", message: "The simulated turn has finished. The message remains queued." };
  }
  async interrupt(execution: ProviderExecution): Promise<void> { const active = this.active.get(execution.run.attemptId); if (active) this.finish(active, "interrupted"); }
  async reconcile(execution: ProviderExecution): Promise<void> { const active = this.active.get(execution.run.attemptId); if (active) this.finish(active, "completed"); }
  async close(): Promise<void> { for (const active of this.active.values()) this.finish(active, "interrupted"); }

  private finish(active: SimulatorExecution, status: "completed" | "failed" | "interrupted", failure?: ExecutionFailure): void {
    if (active.done) return;
    for (const item of active.tools.values()) if (item.state === "running") this.item(active, { ...item,
      state: status === "completed" ? "unconfirmed" : status === "failed" ? "failed" : "interrupted" });
    active.done = true;
    active.emit({ ...this.base(active), kind: "finished", status, usage: { inputTokens: 0, outputTokens: 0 },
      failure: status === "failed" ? failure ?? { code: "provider", message: "Simulated provider failure. No real provider was contacted.", retryable: true } : null });
    active.response?.(null); active.response = undefined; active.controller.abort();
  }
  private base(active: SimulatorExecution) { return { conversationId: active.snapshot.conversation.id, runId: active.run.id, attemptId: active.run.attemptId, eventId: `simulator:${++this.sequence}` }; }
  private item(active: SimulatorExecution, item: TimelineItem): void { active.emit({ ...this.base(active), kind: "item", item }); }
  private async text(active: SimulatorExecution, text: string): Promise<void> {
    if (!await this.pause(active, simulatorPacing.responseGapMs)) return;
    const id = `${active.run.id}:message:${++this.sequence}`;
    const createdAt = new Date().toISOString();
    const chunk = simulatorPacing.textChunkCharacters;
    for (let end = chunk; end < text.length + chunk && !active.done; end += chunk) {
      this.item(active, { id, runId: active.run.id, createdAt, kind: "message", role: "assistant", text: text.slice(0, end), complete: end >= text.length });
      await this.pause(active, simulatorPacing.textChunkMs);
    }
  }
  private async pause(active: SimulatorExecution, milliseconds: number): Promise<boolean> {
    if (active.done) return false;
    await delay(milliseconds * this.speed, undefined, { signal: active.controller.signal }).catch(() => {});
    return !active.done;
  }
  private waitForStop(active: SimulatorExecution): Promise<void> {
    return active.controller.signal.aborted ? Promise.resolve() : new Promise((resolve) => active.controller.signal.addEventListener("abort", () => resolve(), { once: true }));
  }
}

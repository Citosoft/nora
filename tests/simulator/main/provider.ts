import { setTimeout as delay } from "node:timers/promises";
import type { ExecutionProvider, EmitProviderUpdate, ProviderExecution } from "@main/types/execution/provider.types";
import type { ExecutionFailure, RequestResponse, RuntimeRequest, TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { SimulatorExecution, SimulatorStep } from "../types/scenarios.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { normalizeCodexTool } from "@main/providers/codex/toolActivity";
import { simulatedSkills, stepsForScenario } from "../scenarios";
import type { SkillsResult } from "@shared/types/provider/skills.types";
import { simulatorPacing } from "../pacing";
import type { SteeringResult } from "@main/types/execution/steering.types";
import type { McpAction, McpResult } from "@shared/types/provider/mcp.types";
import { SimulatedConnectors } from "./connectors";
import { providerTransitionSteps } from "../providerTransition";
import { join } from "node:path";
import { outputBudgetSteps } from "../outputBudget";

/** Deliberately has no SDK, subprocess, filesystem-tool or network implementation. */
export class SimulatorProvider implements ExecutionProvider {
  readonly instanceId = "simulator";
  readonly capabilities = { ...nativeCapabilities, steering: true, promptSuggestions: true, subagentDetails: true, subagentModel: true };
  private readonly active = new Map<string, SimulatorExecution>();
  private sequence = 0;
  private readonly connectors: SimulatedConnectors;
  constructor(private readonly speed = 1, readonly kind: "codex" | "claude" = "codex") { this.connectors = new SimulatedConnectors(speed); }

  async skills(): Promise<SkillsResult> { return { kind: "skills", skills: [...simulatedSkills] }; }

  async mcp(_workspace: WorkspaceRef | null, action: McpAction): Promise<McpResult> { return this.connectors.handle(action); }

  async catalog(): Promise<ProviderCatalogResult> {
    return { status: "available" as const, catalog: { kind: this.kind, instanceId: this.instanceId, capabilities: this.capabilities,
      authentication: "present" as const, models: [{ id: "simulated", name: "Simulated model · no tokens", description: "Local scripted responses", reasoningEfforts: [], defaultReasoningEffort: null },
        { id: "simulated-small", name: "Simulated small model · no tokens", description: "Local scripted responses for subagents", reasoningEfforts: [], defaultReasoningEffort: null }],
      policies: [{ id: "simulated", label: "Simulated permissions" }] } };
  }

  async start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const active: SimulatorExecution = { ...execution, emit, controller: new AbortController(), done: false, tools: new Map(), agents: new Map(), responses: new Map() };
    this.active.set(execution.run.attemptId, active);
    const base = this.base(active);
    emit({ ...base, kind: "started", nativeConversationId: execution.snapshot.conversation.nativeConversationId ?? `simulated-${this.kind}-${execution.snapshot.conversation.id}-${execution.run.id}`, nativeTurnId: `turn-${execution.run.id}` });
    try {
      if (!await this.pause(active, simulatorPacing.firstResponseMs)) return;
      this.item(active, { id: `${active.run.id}:reasoning`, runId: active.run.id, createdAt: new Date().toISOString(), kind: "reasoning", text: "Example reasoning summary for testing the expandable UI.", complete: true });
      const steps = execution.run.handoff ? providerTransitionSteps(execution) : stepsForScenario(execution.run.instruction);
      const expanded: SimulatorStep[] = [];
      for (const step of steps) expanded.push(...(step.kind === "output-budget" ? await outputBudgetSteps(join(execution.snapshot.conversation.workspace.path, "tool-outputs")) : [step]));
      for (const step of expanded) {
        if (active.done) break;
        if (step.kind !== "pause" && !await this.pause(active, simulatorPacing.actionGapMs)) break;
        switch (step.kind) {
          case "output-budget": throw new Error("Output budget scenario was not expanded");
          case "pause": await this.pause(active, step.milliseconds); break;
          case "text": await this.text(active, step.text); break;
          case "suggestion": active.promptSuggestion = step.text; break;
          case "display": {
            if (step.item.kind === "connector-sign-in") this.connectors.signOut();
            const id = `${active.run.id}:${step.id}`;
            const item: TimelineItem = { ...step.item, id, runId: active.run.id, createdAt: active.agents.get(id)?.createdAt ?? new Date().toISOString(),
              // Like Claude, an agent without its own model runs on the thread's subagent default, else the thread's model.
              ...(step.item.kind === "subagent" && !step.item.model ? { model: active.snapshot.conversation.provider.subagentModel ?? active.snapshot.conversation.provider.model } : {}) };
            if (item.kind === "subagent") active.agents.set(id, item);
            this.item(active, item); break;
          }
          case "tool": {
            const native = step.native;
            const nativeId = native !== null && typeof native === "object" && !Array.isArray(native) && typeof native.id === "string" ? native.id : "tool";
            const id = `${active.run.id}:${nativeId}`;
            const previous = active.tools.get(id);
            const normalized = normalizeCodexTool(native, { id, runId: active.run.id, createdAt: previous?.createdAt ?? new Date().toISOString() }, step.complete, previous);
            const item = normalized && step.details
              ? { ...normalized, details: { ...normalized.details, category: normalized.details?.category ?? "other", ...step.details } } : normalized;
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
          case "approval-batch": await Promise.all(step.approvals.map((approval) => this.ask(active, approval))); break;
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
    const answer = new Promise<RequestResponse | null>((resolve) => { active.responses.set(id, resolve); });
    active.emit({ ...this.base(active), kind: "request", request });
    if (expires) {
      await delay(simulatorPacing.requestExpiryMs + 100, undefined, { signal: active.controller.signal }).catch(() => {});
      if (!active.done && active.responses.has(id)) {
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
    const resolve = active?.responses.get(request.id);
    if (!active || !resolve) throw new Error("No simulated request is pending");
    active.emit({ ...this.base(active), kind: "request-resolved", requestId: request.id });
    active.responses.delete(request.id); resolve(response);
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
    for (const agent of active.agents.values()) if (agent.state === "running") this.item(active, { ...agent,
      state: status === "completed" ? "unconfirmed" : status === "failed" ? "failed" : "interrupted" });
    active.done = true;
    active.emit({ ...this.base(active), kind: "finished", status, usage: { inputTokens: 0, outputTokens: 0 },
      failure: status === "failed" ? failure ?? { code: "provider", message: "Simulated provider failure. No real provider was contacted.", retryable: true } : null });
    if (status === "completed" && active.promptSuggestion) active.emit({ ...this.base(active), kind: "prompt-suggestion", suggestion: active.promptSuggestion });
    for (const resolve of active.responses.values()) resolve(null);
    active.responses.clear(); active.controller.abort();
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

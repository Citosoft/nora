import type { ExecutionHost } from "@main/execution/host";
import type { AcceptanceView, AcceptanceContext } from "./types/acceptance.types";

export function observe(host: ExecutionHost): AcceptanceView {
  const view: AcceptanceView = { runs: new Map(), items: new Map(), requests: new Map(), streamedRuns: new Set(), stop() {} };
  view.stop = host.subscribe({ after: 0, conversationId: "acceptance", onError() {}, onEvent(event) {
    const payload = event.payload;
    if (payload.kind === "run") view.runs.set(payload.run.id, payload.run);
    if (payload.kind === "request") view.requests.set(payload.request.id, payload.request);
    if (payload.kind === "item") {
      view.items.set(payload.item.id, payload.item);
      if (payload.item.kind === "message" && payload.item.role === "assistant" && !payload.item.complete) view.streamedRuns.add(payload.item.runId);
    }
  } });
  return view;
}

export async function until(predicate: () => boolean, timeoutMs = 45_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Native acceptance timed out");
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
}

/** Only accept-once for the explicitly requested temporary edit; other approvals are declined. */
export async function settle(context: AcceptanceContext, runId: string): Promise<void> {
  const answered = new Set<string>();
  await until(() => {
    for (const request of context.view.requests.values()) {
      if (request.runId !== runId || request.status !== "pending" || answered.has(request.id)) continue;
      answered.add(request.id);
      const response = request.kind === "approval" ? { kind: "approval" as const,
        optionId: request.options.find((option) => [runId === "edit" ? "accept" : "decline", runId === "edit" ? "allow" : "deny"].includes(option.id))?.id ?? "cancel" }
        : { kind: "question" as const, answers: Object.fromEntries(request.questions.map((question) => [question.id, [question.options[0] ?? "A"]])) };
      void context.host.execute({ kind: "respond", commandId: `answer:${request.id}`, conversationId: "acceptance", requestId: request.id, response })
        .catch(() => { /* The native terminal state or timeout determines the result. */ });
    }
    const state = context.view.runs.get(runId)?.state;
    return state !== undefined && ["completed", "failed", "interrupted", "recovering"].includes(state);
  });
}

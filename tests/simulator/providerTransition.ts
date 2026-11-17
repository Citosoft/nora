import type { ProviderExecution } from "@main/types/execution/provider.types";
import type { SimulatorStep } from "./types/scenarios.types";

/** Demonstrates the real persisted handoff using scripted responses; never executes the displayed file read. */
export function providerTransitionSteps({ run, snapshot }: ProviderExecution): SimulatorStep[] {
  const handoff = run.handoff;
  if (!handoff) return [];
  return [
    { kind: "text", text: `This fresh **${snapshot.conversation.provider.kind}** session received a bounded history handoff from **${handoff.previousProvider.kind}**. Earlier messages are still in this chat; native tool state and hidden reasoning were not replayed.` },
    { kind: "tool", complete: true, native: { id: "handoff-index", type: "dynamicToolCall", tool: "Read saved chat index (simulated)",
      arguments: { path: handoff.reference.indexPath }, status: "completed", success: true,
      contentItems: [{ type: "inputText", text: `Simulated on-demand read of the historical snapshot captured ${handoff.reference.capturedAt}. The real snapshot exists; this displayed tool call does not execute a command or read a file.` }] } },
    { kind: "text", text: "For this scripted demo, I'll carry forward the earlier decisions: **preserve the public API**, finish `src/parser.ts`, and test malformed input. A real provider uses the bounded handoff and reads more history only when needed." },
    { kind: "display", id: "continued-plan", item: { kind: "plan", steps: [{ text: "Preserve the public API", state: "completed" }, { text: "Implement the parser and test malformed input", state: "completed" }] } },
    { kind: "text", text: "Simulated continuation finished. Try switching back or changing the model. Each applied change starts a fresh session and preserves the same chat history; ordinary follow-ups reuse the current session." }
  ];
}

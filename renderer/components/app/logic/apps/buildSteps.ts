import type { AppBuildStep } from "@shared/types/apps/apps.types";
import type { AppBuildPhase } from "@/components/app/types/appsBuilder.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ConversationRun } from "@shared/types/conversation/contracts.types";

/** The run a thread summary carries: enough to know whether the builder is working, waiting or stopped. */
export type AppBuilderRun = NonNullable<ConversationSummary["latestRun"]>;

/** Lines the building scene shows for each step the builder's tools report; the opening line covers the model thinking before any tool call. */
export function buildStepLine(step: AppBuildStep | null, update: boolean): string {
  if (!step) return update ? "Working out the change…" : "Thinking about your app…";
  switch (step.kind) {
    case "connectors": return "Looking at your connectors…";
    case "sample": return step.detail ? `Trying ${step.detail}…` : "Trying your data…";
    case "save": return update ? "Applying the change…" : "Composing your app…";
    case "saved": return "Almost there…";
  }
}

const ACTIVE_RUN_STATES = new Set<ConversationRun["state"]>(["queued", "starting", "running", "stopping", "recovering"]);
const ATTENTION_RUN_STATES = new Set<ConversationRun["state"]>(["awaiting-approval", "awaiting-input"]);

/** Where the builder is, from its thread's latest run and whether an instruction is still being delivered. */
export function appBuildPhase(run: AppBuilderRun | null, delivering: boolean, hasApp: boolean): AppBuildPhase {
  if (delivering || (run && ACTIVE_RUN_STATES.has(run.state))) return { kind: "building" };
  if (run && ATTENTION_RUN_STATES.has(run.state)) return { kind: "attention" };
  if (run?.state === "failed" && run.failure) return { kind: "failed", message: run.failure.message };
  if (run?.state === "interrupted" && !hasApp) return { kind: "failed", message: "You stopped the build before the app was saved. Ask again from the chat when you are ready." };
  if (!hasApp) return run ? { kind: "failed", message: "The app was not created. Open the chat to see what happened." } : { kind: "building" };
  return { kind: "ready" };
}

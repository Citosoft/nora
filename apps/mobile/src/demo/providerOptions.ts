import type { ProviderOptionsResponse } from "@shared/types/remote-access/runtimeApi.types";
import { demoProvider } from "./seed";

export const demoProviderOptions: ProviderOptionsResponse = {
  defaultBinding: demoProvider,
  providers: [{ label: "Claude (demo)", result: { status: "available", catalog: {
    kind: demoProvider.kind, instanceId: demoProvider.instanceId, authentication: "present",
    capabilities: { resume: true, interrupt: true, steering: false, approvals: true, questions: true, reasoning: true,
      attachments: false, turnChanges: false, subagentDetails: false },
    models: [{ id: demoProvider.model, name: "Claude Opus (demo)", description: "Offline demo", reasoningEfforts: ["low", "medium", "high"], defaultReasoningEffort: null }],
    policies: [{ id: "ask", label: "Ask permissions", posture: "ask" }, { id: "full", label: "Full access", posture: "full" }]
  } } }]
};

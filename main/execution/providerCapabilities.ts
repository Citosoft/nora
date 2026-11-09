import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";

export const nativeCapabilities: Readonly<ProviderCapabilities> = Object.freeze({
  resume: true, interrupt: true, steering: false, approvals: true, questions: true,
  reasoning: true, attachments: false, turnChanges: false, subagentDetails: false
});

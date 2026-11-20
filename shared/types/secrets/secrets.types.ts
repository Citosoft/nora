import type { z } from "zod";
import type { secretPromptAnswerSchema, secretPromptSchema, secretScopeSchema, secretSummarySchema, vaultSecretSchema } from "@shared/secrets/contracts";

export type SecretScope = z.infer<typeof secretScopeSchema>;
/** What Nora records about a saved secret besides its value: what it is for and where it applies. */
export type SecretSummary = z.infer<typeof secretSummarySchema>;
export type VaultSecret = z.infer<typeof vaultSecretSchema>;
export type SecretPrompt = z.infer<typeof secretPromptSchema>;
export type SecretInputPrompt = Extract<SecretPrompt, { kind: "input" }>;
export type SecretUsePrompt = Extract<SecretPrompt, { kind: "use" }>;
export type SecretPromptAnswer = z.infer<typeof secretPromptAnswerSchema>;

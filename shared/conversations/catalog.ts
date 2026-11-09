import { z } from "zod";
import { failureSchema } from "./contracts";

export const capabilitiesSchema = z.object({ resume: z.boolean(), interrupt: z.boolean(), steering: z.boolean(),
  approvals: z.boolean(), questions: z.boolean(), reasoning: z.boolean(), attachments: z.boolean(),
  turnChanges: z.boolean(), subagentDetails: z.boolean() }).strict();
export const modelSchema = z.object({ id: z.string().min(1), name: z.string(), description: z.string(),
  reasoningEfforts: z.array(z.string()), defaultReasoningEffort: z.string().nullable() }).strict();
export const policySchema = z.object({ id: z.string().min(1), label: z.string() }).strict();
export const catalogSchema = z.object({ kind: z.enum(["claude", "codex"]), instanceId: z.string().min(1),
  capabilities: capabilitiesSchema, models: z.array(modelSchema), policies: z.array(policySchema),
  authentication: z.enum(["required", "present", "unknown"]) }).strict();
export const catalogResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("available"), catalog: catalogSchema }).strict(),
  z.object({ status: z.literal("unavailable"), failure: failureSchema }).strict()
]);

import { z } from "zod";
import { providerKindSchema } from "@shared/providers/providerKinds";
import { providerConnectionSchema } from "@shared/providers/account";
import { failureSchema } from "./contracts";

export const capabilitiesSchema = z.object({ resume: z.boolean(), interrupt: z.boolean(), steering: z.boolean(),
  approvals: z.boolean(), questions: z.boolean(), reasoning: z.boolean(), attachments: z.boolean(),
  turnChanges: z.boolean(), subagentDetails: z.boolean(), promptSuggestions: z.boolean().optional(),
  /** Accepts a default model for the subagents it spawns (`ProviderBinding.subagentModel`). */
  subagentModel: z.boolean().optional(),
  /** Enforces read-only command execution for worker threads, independently of the selected model. */
  readOnlyCommands: z.boolean().optional(),
  /** Reports native context occupancy after model requests. */
  contextUsage: z.boolean().optional(),
  /** Compacts native context on request. */
  compaction: z.boolean().optional(),
  /** Renders MCP Apps widgets; `toolCalls` says whether a widget's own tool calls can run. */
  mcpApps: z.object({ toolCalls: z.boolean() }).strict().optional() }).strict();
export const modelSchema = z.object({ id: z.string().min(1), name: z.string(), description: z.string(),
  reasoningEfforts: z.array(z.string()), defaultReasoningEffort: z.string().nullable() }).strict();
export const policySchema = z.object({ id: z.string().min(1), label: z.string(), description: z.string().optional() }).strict();
export const catalogSchema = z.object({ kind: providerKindSchema, instanceId: z.string().min(1),
  capabilities: capabilitiesSchema, models: z.array(modelSchema), policies: z.array(policySchema),
  connection: providerConnectionSchema.optional(),
  authentication: z.enum(["required", "present", "unknown"]) }).strict();
export const catalogResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("available"), catalog: catalogSchema }).strict(),
  z.object({ status: z.literal("unavailable"), failure: failureSchema }).strict()
]);

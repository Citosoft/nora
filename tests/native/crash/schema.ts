import { z } from "zod";
import { commandReceiptSchema, runSchema } from "@shared/conversations/contracts";

export const crashConfigSchema = z.object({
  mode: z.enum(["host-crash", "provider-crash"]), workspacePath: z.string().min(1), databasePath: z.string().min(1),
  executable: z.string().min(1), arguments: z.array(z.string()), environment: z.record(z.string(), z.string().nullable()),
  auditPath: z.string().min(1), controlPath: z.string().min(1), model: z.string().min(1), reasoning: z.string().nullable()
}).strict();
export const workerCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("start"), config: crashConfigSchema }).strict(),
  z.object({ kind: z.literal("stop") }).strict()
]);
export const workerMessageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ready"), activeReceipt: commandReceiptSchema, queuedReceipt: commandReceiptSchema }).strict(),
  z.object({ kind: z.literal("state"), state: runSchema.shape.state, nativeTurnKnown: z.boolean(), pendingRequest: z.boolean() }).strict(),
  z.object({ kind: z.literal("failed") }).strict()
]);
export const auditSchema = z.object({ instance: z.string(), event: z.enum(["proxy-start", "client-request", "client-response",
  "native-turn-accepted", "native-request", "native-turn-completed", "native-history-read", "native-exit", "native-error"]),
  method: z.string().optional(), outcomes: z.array(z.enum(["inProgress", "completed", "failed", "interrupted", "unsupported"])).optional() }).strict();

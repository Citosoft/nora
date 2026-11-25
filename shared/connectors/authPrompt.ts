import { z } from "zod";
import { connectorIdSchema } from "./contracts";
import { mcpServerLogoSchema } from "@shared/providers/mcp";

const promptId = z.string().min(1);

/** A thread-facing prompt while a connector tool call waits on OAuth sign-in. Never carries secrets or tokens. */
export const connectorAuthPromptSchema = z.object({
  id: promptId,
  /** The asking thread first, then its parents so a chat can show a bot worker's prompt. */
  conversationIds: z.array(z.string().min(1)).min(1),
  connectorId: connectorIdSchema,
  connectorName: z.string().min(1),
  serverName: z.string().min(1),
  logo: mcpServerLogoSchema.optional(),
  message: z.string().min(1).optional(),
  createdAt: z.string().min(1)
}).strict();

export const connectorAuthPromptListSchema = z.array(connectorAuthPromptSchema);

export const connectorAuthPromptAnswerSchema = z.discriminatedUnion("kind", [
  /** Starts browser sign-in for the connector; the waiting call retries once Nora has tokens. */
  z.object({ kind: z.literal("authorize"), promptId }).strict(),
  z.object({ kind: z.literal("decline"), promptId }).strict()
]);

/** The window lists and answers connector authorize prompts here. */
export const connectorAuthPromptsChannel = "connectors:auth-prompts";
/** Pushed with every waiting authorize prompt whenever one opens, is answered or lapses. */
export const connectorAuthPromptsChangedChannel = "connectors:auth-prompts-changed";

export const connectorAuthPromptGatewayRequestSchema = z.union([
  z.object({ kind: z.literal("pending") }).strict(),
  connectorAuthPromptAnswerSchema
]);
/** Every reply carries the prompts still waiting, so the window always shows main's truth. */
export const connectorAuthPromptGatewayReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), prompts: connectorAuthPromptListSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);

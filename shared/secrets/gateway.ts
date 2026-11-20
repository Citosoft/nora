import { z } from "zod";
import { SECRET_PURPOSE_MAX, secretNameSchema, secretPromptAnswerSchema, secretPromptListSchema, secretValueSchema, vaultSecretListSchema } from "./contracts";

/**
 * The only path a secret's value travels: from the window's secure dialog straight to main, which stores it. It is deliberately
 * separate from the conversation gateway so values can never reach a transcript, a provider or a synced store.
 */
export const secretsChannel = "secrets:request";
/** Pushed with every waiting prompt whenever one opens, is answered or lapses. */
export const secretPromptsChangedChannel = "secrets:prompts-changed";

export const secretGatewayRequestSchema = z.union([z.object({ kind: z.literal("pending") }).strict(), secretPromptAnswerSchema]);
/** Every reply carries the prompts still waiting, so the window always shows main's truth. */
export const secretGatewayReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), prompts: secretPromptListSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);

/** Settings manages saved secrets here: values go in, but only names, purposes and scopes ever come back. */
export const secretVaultChannel = "secrets:vault";
/** Pushed with every saved secret whenever one is saved or deleted, including by a thread's secure dialog. */
export const secretVaultChangedChannel = "secrets:vault-changed";

const projectId = z.string().min(1).nullable();
export const secretVaultRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list") }).strict(),
  /** Adds a secret, or replaces the value and purpose of the one already saved under that name and scope. */
  z.object({ kind: z.literal("save"), name: secretNameSchema, purpose: z.string().trim().max(SECRET_PURPOSE_MAX), projectId, value: secretValueSchema }).strict(),
  z.object({ kind: z.literal("remove"), name: secretNameSchema, projectId }).strict()
]);
export const secretVaultReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), secrets: vaultSecretListSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);

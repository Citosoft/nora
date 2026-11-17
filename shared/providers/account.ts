import { z } from "zod";
import { providerKindSchema } from "./providerKinds";

export const providerAccountActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("read") }).strict(),
  z.object({ kind: z.literal("login") }).strict()
]);
export const providerAccountRequestSchema = z.object({ schemaVersion: z.literal(1), environmentId: z.string().min(1).max(512),
  providerKind: providerKindSchema, instanceId: z.string().min(1).max(512), action: providerAccountActionSchema }).strict();
export const providerAccountSchema = z.discriminatedUnion("state", [
  /** `method` names how the runtime authenticates (e.g. "ChatGPT Pro", "API key"); `label` identifies the account when known. */
  z.object({ state: z.literal("signed-in"), method: z.string().min(1), label: z.string().nullable() }).strict(),
  z.object({ state: z.literal("signed-out") }).strict(),
  z.object({ state: z.literal("unknown") }).strict()
]);
export const providerAccountResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("account"), account: providerAccountSchema }).strict(),
  /** The runtime started a browser sign-in the client must open. */
  z.object({ kind: z.literal("login"), authorizationUrl: z.url().refine((value) => ["https:", "http:"].includes(new URL(value).protocol)) }).strict(),
  /** The runtime opened its own browser sign-in; the client should re-read the account. */
  z.object({ kind: z.literal("login-started") }).strict(),
  z.object({ kind: z.literal("unavailable"), message: z.string() }).strict()
]);

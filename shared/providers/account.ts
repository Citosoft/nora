import { z } from "zod";
import { providerKindSchema } from "./providerKinds";

export const providerConnectionSchema = z.enum(["subscription", "api", "unknown"]);

/** One way a runtime can sign in (e.g. a subscription vs. API billing); ids are opaque to the client and owned by the adapter. */
export const providerLoginMethodSchema = z.object({ id: z.string().min(1).max(64), label: z.string().min(1).max(120),
  description: z.string().max(240) }).strict();
export const providerAccountActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("read") }).strict(),
  /** `methodId` picks one of the account reply's `loginMethods`; omitted, the runtime uses its default sign-in. */
  z.object({ kind: z.literal("login"), methodId: z.string().min(1).max(64).optional() }).strict()
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
  /** `loginMethods` lists the sign-ins the client may offer; empty means a single default sign-in. */
  z.object({ kind: z.literal("account"), connection: providerConnectionSchema.optional(), account: providerAccountSchema, loginMethods: z.array(providerLoginMethodSchema).max(8) }).strict(),
  /** The runtime started a browser sign-in the client must open. */
  z.object({ kind: z.literal("login"), authorizationUrl: z.url().refine((value) => ["https:", "http:"].includes(new URL(value).protocol)) }).strict(),
  /** The runtime opened its own browser sign-in; the client should re-read the account. */
  z.object({ kind: z.literal("login-started") }).strict(),
  z.object({ kind: z.literal("unavailable"), message: z.string() }).strict()
]);

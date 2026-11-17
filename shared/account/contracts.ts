import { z } from "zod";

export const ACCOUNT_CHANNELS = {
  read: "account:read", open: "account:open", changed: "account:changed",
  config: "account:config", publish: "account:publish"
} as const;

export const accountConfigSchema = z.object({ publishableKey: z.string().max(512) }).strict();
export const accountActionSchema = z.enum(["manage", "sign-out"]);
export const accountStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unconfigured") }).strict(),
  z.object({ status: z.literal("loading") }).strict(),
  z.object({ status: z.literal("signed-out") }).strict(),
  z.object({ status: z.literal("signed-in"), user: z.object({
    id: z.string().min(1).max(256), name: z.string().min(1).max(256),
    imageUrl: z.url().refine((value) => new URL(value).protocol === "https:").nullable()
  }).strict() }).strict(),
  z.object({ status: z.literal("error"), message: z.string().min(1).max(512) }).strict()
]);
export const accountReportSchema = z.object({ state: accountStateSchema, sessionId: z.string().min(1).max(256).nullable().optional() }).strict();

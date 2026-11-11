import { z } from "zod";
import { providerKindSchema } from "@shared/providers/providerKinds";
import { personalizationSchema, roleSelectionSchema } from "./contracts";
import { nativeWorkspaceSchema } from "./workspaces";

export const nativeProviderSchema = z.object({ kind: providerKindSchema, instanceId: z.string().min(1), label: z.string().min(1) }).strict();
export const personalizationRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("boot") }).strict(),
  /** Re-detects installed runtimes so agents installed while Nora runs become usable without a restart. */
  z.object({ kind: z.literal("refresh-providers") }).strict(),
  z.object({ kind: z.literal("onboard"), role: roleSelectionSchema }).strict(),
  z.object({ kind: z.literal("set-role"), workspaceId: z.string().min(1).nullable(), role: roleSelectionSchema.nullable() }).strict(),
  z.object({ kind: z.literal("add-workspace") }).strict(),
  z.object({ kind: z.literal("register-workspace"), projectId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("open-workspace-folder"), workspaceId: z.string().min(1) }).strict()
]);
export const nativeBootSchema = z.object({ environmentId: z.string().min(1), cursor: z.number().int().nonnegative(), personalization: personalizationSchema,
  workspaces: z.array(nativeWorkspaceSchema), providers: z.array(nativeProviderSchema) }).strict();
export const personalizationReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), state: nativeBootSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
export const personalizationChannel = "personalization:request";

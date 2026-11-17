import { z } from "zod";
import { providerKindSchema } from "./providerKinds";
import { workspaceRefSchema } from "@shared/conversations/contracts";

export const skillsRequestSchema = z.object({ schemaVersion: z.literal(1), environmentId: z.string().min(1).max(512),
  providerKind: providerKindSchema, instanceId: z.string().min(1).max(512), workspace: workspaceRefSchema,
  /** Re-scan skill folders instead of reusing the runtime's cached list. */
  refresh: z.boolean() }).strict();
/** A skill the runtime offers in a checkout. `workspace` skills come from the checkout itself; `plugin` names the owning plugin. */
export const skillSchema = z.object({ name: z.string().min(1), description: z.string(),
  scope: z.enum(["user", "workspace", "plugin", "system", "unknown"]), plugin: z.string().optional() }).strict();
export const skillsResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("skills"), skills: z.array(skillSchema) }).strict(),
  z.object({ kind: z.literal("unavailable"), message: z.string() }).strict()
]);

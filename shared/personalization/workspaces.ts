import { z } from "zod";
import { workspaceRefSchema } from "@shared/conversations/contracts";

export const nativeWorkspaceSchema = z.object({
  id: z.string().min(1).max(512), name: z.string().min(1),
  shellProjectId: z.string().min(1).optional(),
  kind: z.enum(["personal", "folder", "repository"]), workspace: workspaceRefSchema
}).strict();
export const nativeWorkspaceIndexSchema = z.object({ version: z.literal(1), workspaces: z.array(nativeWorkspaceSchema) }).strict();

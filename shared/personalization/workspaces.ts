import { z } from "zod";
import { workspaceRefSchema } from "@shared/conversations/contracts";

export const nativeWorkspaceSchema = z.object({
  id: z.string().min(1).max(512), name: z.string().min(1),
  shellProjectId: z.string().min(1).optional(),
  kind: z.enum(["personal", "folder", "repository"]), workspace: workspaceRefSchema,
  /**
   * Further registered checkouts of the same workspace, such as its Git worktrees. Threads may run in any of them while
   * keeping the workspace's identity (roles, bots, thread list); `workspace` stays the primary checkout.
   */
  checkouts: z.array(workspaceRefSchema).optional()
}).strict();
export const nativeWorkspaceIndexSchema = z.object({ version: z.literal(1), workspaces: z.array(nativeWorkspaceSchema) }).strict();

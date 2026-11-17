import { z } from "zod";
import type { CreateWorktreePayload } from "./types/worktreeCreation.types";

const payloadSchema = z.object({ projectId: z.string().trim().min(1), branch: z.string().trim().min(1).max(200) }).strict();

export function parseCreateWorktreePayload(value: unknown): CreateWorktreePayload {
  const result = payloadSchema.safeParse(value);
  if (!result.success) throw new Error("Choose a workspace and enter a new branch name (up to 200 characters).");
  return result.data;
}

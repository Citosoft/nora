import type { z } from "zod";
import type { chatBranchNameReplySchema, chatBranchNameRequestSchema, chatBranchReplySchema, chatBranchRequestSchema } from "@shared/bots/branches/gateway";

export type ChatBranchRequest = z.infer<typeof chatBranchRequestSchema>;
export type ChatBranchReply = z.infer<typeof chatBranchReplySchema>;
export type ChatBranchNameRequest = z.infer<typeof chatBranchNameRequestSchema>;
export type ChatBranchNameReply = z.infer<typeof chatBranchNameReplySchema>;
export interface ChatBranchBridge {
  /** Starts the branch and sends its first message; resolves to the branch thread's id. */
  start(input: ChatBranchRequest): Promise<string>;
  /** A generated name for a branch from `message`; rejects when the simple AI tasks model is unavailable. */
  name(input: ChatBranchNameRequest): Promise<string>;
}

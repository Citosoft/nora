import { chatBranchNameChannel, chatBranchNameReplySchema, chatBranchReplySchema, chatBranchesChannel } from "@shared/bots/branches/gateway";
import type { ChatBranchBridge } from "@shared/ipc/types/chatBranchGateway.types";
import { invokeIpc } from "./invokeIpc";

export function createChatBranchBridge(): ChatBranchBridge {
  return {
    async start(input) {
      const reply = chatBranchReplySchema.safeParse(await invokeIpc(chatBranchesChannel, input));
      if (!reply.success) throw new Error("Nora returned an incompatible response for chat branches");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.conversationId;
    },
    async name(input) {
      const reply = chatBranchNameReplySchema.safeParse(await invokeIpc(chatBranchNameChannel, input));
      if (!reply.success) throw new Error("Nora returned an incompatible response for branch names");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.title;
    }
  };
}

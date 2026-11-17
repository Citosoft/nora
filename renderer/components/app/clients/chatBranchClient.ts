import type { ChatBranchBridge } from "@shared/ipc/types/chatBranchGateway.types";

export const chatBranchClient: ChatBranchBridge = {
  start: (input) => window.nora.chatBranches.start(input),
  name: (input) => window.nora.chatBranches.name(input)
};

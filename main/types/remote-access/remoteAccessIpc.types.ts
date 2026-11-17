import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { RemoteAccessReply } from "@shared/types/remote-access/remoteAccess.types";
import type { RemoteAccessService } from "./service.types";

export interface RemoteAccessIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<RemoteAccessReply>): void;
    removeHandler(channel: string): void;
  };
  service: RemoteAccessService;
  isAllowedSender(event: ConversationInvocation): boolean;
}

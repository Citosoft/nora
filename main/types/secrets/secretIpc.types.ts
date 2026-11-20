import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { SecretGatewayReply, SecretVaultReply } from "@shared/ipc/types/secretGateway.types";
import type { SecretService } from "./secrets.types";

export interface SecretIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<SecretGatewayReply | SecretVaultReply>): void;
    removeHandler(channel: string): void;
  };
  secrets: Pick<SecretService, "pending" | "answer" | "vault" | "save" | "remove">;
  isAllowedSender(event: ConversationInvocation): boolean;
}

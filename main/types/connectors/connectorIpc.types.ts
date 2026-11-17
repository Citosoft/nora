import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { ConnectorReply } from "@shared/ipc/types/connectorGateway.types";
import type { ConnectorService } from "./connectors.types";

export interface ConnectorIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<ConnectorReply>): void;
    removeHandler(channel: string): void;
  };
  connectors: ConnectorService;
  isAllowedSender(event: ConversationInvocation): boolean;
}

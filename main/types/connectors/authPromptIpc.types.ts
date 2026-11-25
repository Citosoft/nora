import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { ConnectorAuthPromptGatewayReply } from "@shared/ipc/types/connectorAuthPromptGateway.types";
import type { ConnectorAuthPromptBroker } from "@main/types/connectors/authPrompt.types";
import type { ConnectorService } from "./connectors.types";

export interface ConnectorAuthPromptIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<ConnectorAuthPromptGatewayReply>): void;
    removeHandler(channel: string): void;
  };
  prompts: ConnectorAuthPromptBroker;
  connectors: Pick<ConnectorService, "signIn">;
  isAllowedSender(event: ConversationInvocation): boolean;
}

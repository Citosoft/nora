import type { z } from "zod";
import type {
  connectorAuthPromptGatewayReplySchema,
  connectorAuthPromptGatewayRequestSchema
} from "@shared/connectors/authPrompt";
import type { ConnectorAuthPrompt } from "@shared/types/connectors/authPrompt.types";

export type ConnectorAuthPromptGatewayRequest = z.infer<typeof connectorAuthPromptGatewayRequestSchema>;
export type ConnectorAuthPromptGatewayReply = z.infer<typeof connectorAuthPromptGatewayReplySchema>;

export interface ConnectorAuthPromptBridge {
  /** Lists the waiting authorize prompts or answers one; resolves with the prompts still waiting. */
  request(input: ConnectorAuthPromptGatewayRequest): Promise<ConnectorAuthPrompt[]>;
  /** Called with every waiting prompt whenever the set changes; returns an unsubscribe function. */
  onChanged(listener: (prompts: ConnectorAuthPrompt[]) => void): () => void;
}

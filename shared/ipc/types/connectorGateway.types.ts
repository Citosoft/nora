import type { z } from "zod";
import type { connectorReplySchema, connectorRequestSchema } from "@shared/connectors/gateway";
import type { Connector } from "@shared/types/connectors/connectors.types";

export type ConnectorRequest = z.infer<typeof connectorRequestSchema>;
export type ConnectorReply = z.infer<typeof connectorReplySchema>;
export interface ConnectorBridge {
  request(input: ConnectorRequest): Promise<Connector[]>;
  /** Called with every connector whenever one changes; returns an unsubscribe function. */
  onChanged(listener: (connectors: Connector[]) => void): () => void;
}

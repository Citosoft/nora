import type { ConnectorBridge } from "@shared/ipc/types/connectorGateway.types";

export const connectorClient: ConnectorBridge = {
  request: (input) => window.nora.connectors.request(input),
  onChanged: (listener) => window.nora.connectors.onChanged(listener),
  authPrompts: {
    request: (input) => window.nora.connectors.authPrompts.request(input),
    onChanged: (listener) => window.nora.connectors.authPrompts.onChanged(listener)
  }
};

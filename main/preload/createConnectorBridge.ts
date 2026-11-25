import { connectorReplySchema, connectorsChangedChannel, connectorsChannel } from "@shared/connectors/gateway";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { ConnectorBridge } from "@shared/ipc/types/connectorGateway.types";
import { createConnectorAuthPromptBridge } from "./createConnectorAuthPromptBridge";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createConnectorBridge(): ConnectorBridge {
  return {
    async request(input) {
      const reply = connectorReplySchema.safeParse(await invokeIpc(connectorsChannel, input));
      if (!reply.success) throw new Error("Nora returned an incompatible response for connectors");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.connectors;
    },
    onChanged: (listener) => subscribeToIpcEvent<Connector[]>(connectorsChangedChannel, listener),
    authPrompts: createConnectorAuthPromptBridge()
  };
}

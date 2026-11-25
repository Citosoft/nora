import {
  connectorAuthPromptGatewayReplySchema,
  connectorAuthPromptsChangedChannel,
  connectorAuthPromptsChannel
} from "@shared/connectors/authPrompt";
import type { ConnectorAuthPrompt } from "@shared/types/connectors/authPrompt.types";
import type { ConnectorAuthPromptBridge } from "@shared/ipc/types/connectorAuthPromptGateway.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createConnectorAuthPromptBridge(): ConnectorAuthPromptBridge {
  return {
    async request(input) {
      const reply = connectorAuthPromptGatewayReplySchema.safeParse(await invokeIpc(connectorAuthPromptsChannel, input));
      if (!reply.success) throw new Error("Nora returned an incompatible response for connector sign-in prompts");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.prompts;
    },
    onChanged: (listener) => subscribeToIpcEvent<ConnectorAuthPrompt[]>(connectorAuthPromptsChangedChannel, listener)
  };
}

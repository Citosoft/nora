import { getCACertificates } from "node:tls";
import { Agent } from "undici";
import type { ConnectorNetwork, ConnectorNetworkRequestInit } from "@main/types/connectors/connectors.types";

/** Use the machine's trusted enterprise CAs alongside Node's defaults, scoped to MCP traffic. */
export function createConnectorNetwork(): ConnectorNetwork {
  const dispatcher = new Agent({ connect: { ca: [...new Set([...getCACertificates("default"), ...getCACertificates("system")])] } });
  return {
    fetch: (input, init) => {
      const options: ConnectorNetworkRequestInit = { ...init, dispatcher };
      return fetch(input, options);
    },
    close: () => dispatcher.destroy()
  };
}

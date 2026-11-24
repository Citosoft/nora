import type { RuntimeMcpState } from "@/components/app/types/runtimeMcp.types";
import type { BotAccountConnectorsState } from "@/components/app/types/botEditor.types";

/** The account connectors in a runtime's MCP listing, connected ones first, for choosing which a bot may use. */
export function botAccountConnectorsFrom(state: RuntimeMcpState): BotAccountConnectorsState {
  switch (state.status) {
    case "loading": return { status: "loading" };
    case "error": return { status: "unavailable", message: state.message };
    case "loaded": {
      const { result } = state;
      if (result.kind === "unavailable") return { status: "unavailable", message: result.message };
      if (result.kind !== "servers") return { status: "loading" };
      const connectors = result.servers.flatMap((server) => server.accountConnector
        ? [{ name: server.name, connected: server.accountConnector === "connected", ...(server.logo ? { logo: server.logo } : {}) }] : [])
        .sort((a, b) => Number(b.connected) - Number(a.connected) || a.name.localeCompare(b.name));
      return { status: "loaded", connectors, ...(result.notice ? { notice: result.notice } : {}) };
    }
  }
}

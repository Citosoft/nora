import { setTimeout as delay } from "node:timers/promises";
import type { McpAction, McpResult, McpServer } from "@shared/types/provider/mcp.types";
import { simulatorPacing } from "../pacing";
import { simulatedConnectorName } from "../scenarios";

/** Local stand-ins for runtime MCP connectors; sign-in only waits, it never opens a browser or contacts a server. */
export class SimulatedConnectors {
  private signedIn = false;
  constructor(private readonly speed = 1) {}

  /** The sign-in scenario always starts signed out so it can be repeated without restarting the simulator. */
  signOut(): void { this.signedIn = false; }

  async handle(action: McpAction): Promise<McpResult> {
    if (action.kind === "login") {
      if (action.serverName !== simulatedConnectorName) return { kind: "unavailable", message: `${action.serverName} is not a simulated connector.` };
      await delay(simulatorPacing.connectorSignInMs * this.speed);
      this.signedIn = true;
    }
    return { kind: "servers", servers: this.servers() };
  }

  private servers(): McpServer[] {
    const base = { scope: "global" as const, tools: [] };
    return [
      { ...base, name: "Team documents", status: "connected", authStatus: "unsupported", canLogin: false,
        tools: [{ name: "Search documentation" }, { name: "Read document" }] },
      this.signedIn
        ? { ...base, name: simulatedConnectorName, status: "connected", authStatus: "authenticated", canLogin: false,
          tools: [{ name: "List issues" }, { name: "Read issue" }, { name: "Comment on issue" }] }
        : { ...base, name: simulatedConnectorName, status: "needs-auth", authStatus: "needs-auth", canLogin: true }
    ];
  }
}

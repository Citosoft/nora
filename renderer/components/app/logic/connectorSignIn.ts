import { MCP_SERVER_STATUS_BADGES } from "@/components/app/constants/mcpServerStatus";
import type { ConnectorSignInStatus, ConnectorSignInStatusInput } from "@/components/app/types/connectorSignIn.types";

/** Matches the requested connector against the thread's discovered servers; models may not preserve the runtime's casing. */
export function connectorSignInStatus({ serverName, summary, login }: ConnectorSignInStatusInput): ConnectorSignInStatus {
  if (!summary || summary.status === "loading") return { kind: "checking" };
  if (summary.status === "unavailable") return { kind: "unavailable", message: summary.message };
  const wanted = serverName.trim().toLowerCase();
  const server = summary.servers.find((candidate) => candidate.name.toLowerCase() === wanted);
  if (!server) return { kind: "missing" };
  if (server.status === "connected" && server.authStatus !== "needs-auth") return { kind: "connected", server };
  if (server.canLogin || login) return { kind: "sign-in", server, failure: login?.status === "failed" ? login.message : null };
  return { kind: "blocked", server };
}

/** One line telling the user what the connector's state means for the thread and what to do next. */
export function connectorSignInDetail(status: ConnectorSignInStatus, serverName: string, providerLabel: string): string {
  switch (status.kind) {
    case "checking": return `Checking ${providerLabel} connectors…`;
    case "unavailable": return status.message;
    case "missing": return `${serverName} is not enabled for ${providerLabel} in this thread. Add or enable it in MCP Servers settings.`;
    case "sign-in": return status.failure ?? `${providerLabel} needs you to sign in before it can use this connector.`;
    case "blocked": return status.server.message ?? `${MCP_SERVER_STATUS_BADGES[status.server.status].label}. Sign in from ${providerLabel}'s own settings, then refresh.`;
    case "connected": {
      const tools = status.server.tools.length;
      return `${tools} ${tools === 1 ? "tool" : "tools"} available. Send a message to continue.`;
    }
  }
}

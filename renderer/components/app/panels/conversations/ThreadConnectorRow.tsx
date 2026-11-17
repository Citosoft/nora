import { MCP_SERVER_STATUS_BADGES } from "@/components/app/constants/mcpServerStatus";
import { McpLoginButton } from "@/components/app/panels/settings/McpLoginButton";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import type { ThreadConnectorRowProps } from "@/components/app/types/threadConnectors.types";
import { Badge } from "@/components/ui/badge";

/** One connector's logo and name, with its tool count once connected, a sign-in action when the runtime offers one, or its status. */
export function ThreadConnectorRow({ server, source, logins }: ThreadConnectorRowProps) {
  const status = MCP_SERVER_STATUS_BADGES[server.status];
  const tools = `${server.tools.length} ${server.tools.length === 1 ? "tool" : "tools"}`;
  const signingIn = !!logins.state(source, server.name);
  return <li className="flex min-h-6 min-w-0 items-center gap-2" title={server.message ?? `${server.name} · ${tools}`}>
    <McpServerLogo logo={server.logo} />
    <span className="min-w-0 flex-1 truncate">{server.name}</span>
    {server.canLogin || signingIn ? <McpLoginButton server={server} source={source} logins={logins} compact />
      : server.status === "connected" ? <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">{tools}</span>
      : <Badge variant={status.variant} className="shrink-0 whitespace-nowrap px-1.5 py-0 text-[10px]">{status.label}</Badge>}
  </li>;
}

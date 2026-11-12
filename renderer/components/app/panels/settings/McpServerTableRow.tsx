import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { McpServerTableRowProps } from "@/components/app/types/runtimeMcp.types";
import { McpLoginButton } from "@/components/app/panels/settings/McpLoginButton";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { MCP_SERVER_STATUS_BADGES } from "@/components/app/constants/mcpServerStatus";
import { Badge } from "@/components/ui/badge";
import type { McpServer } from "@shared/types/provider/mcp.types";

const SCOPE_LABELS: Readonly<Record<McpServer["scope"], string>> = { global: "Global", workspace: "Workspace", unknown: "Unknown" };
const CELL_CLASS_NAME = "px-3 py-2 align-middle";

export function McpServerTableRow({ server, source, logins }: McpServerTableRowProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const status = MCP_SERVER_STATUS_BADGES[server.status];
  const hasDetails = server.tools.length > 0 || Boolean(server.message);
  return <>
    <tr className="border-b border-border/40 last:border-0">
      <td className={CELL_CLASS_NAME}>
        <div className="flex min-w-0 items-center gap-2">
          <McpServerLogo logo={server.logo} />
          <span className="break-words font-medium">{server.name}</span>
        </div>
      </td>
      <td className={`${CELL_CLASS_NAME} text-muted-foreground`}>
        <div className="flex items-center gap-2"><AgentToolIcon toolId={source.kind} label="" className="size-4 shrink-0" imageClassName="size-3.5" />{source.label}</div>
      </td>
      <td className={`${CELL_CLASS_NAME} text-muted-foreground`}>{SCOPE_LABELS[server.scope]}</td>
      <td className={CELL_CLASS_NAME}><Badge variant={status.variant} className="whitespace-nowrap">{status.label}</Badge></td>
      <td className={CELL_CLASS_NAME}>
        {hasDetails ? <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1 rounded-[3px] text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronRight className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
          {server.tools.length}<span className="sr-only"> tools for {server.name}</span>
        </button> : <span className="text-muted-foreground">0</span>}
      </td>
      <td className={`${CELL_CLASS_NAME} text-right`}>
        {server.canLogin ? <McpLoginButton server={server} source={source} logins={logins} /> : null}
      </td>
    </tr>
    {expanded ? <tr id={detailsId} className="border-b border-border/40 bg-muted/20 last:border-0">
      <td colSpan={6} className="px-3 py-3 text-xs">
        {server.message ? <p className="mb-2 text-muted-foreground">{server.message}</p> : null}
        {server.tools.length ? <ul className="space-y-2">{server.tools.map((tool) => <li key={tool.name}>
          <span className="break-words font-medium">{tool.name}</span>
          {tool.description ? <p className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">{tool.description}</p> : null}
        </li>)}</ul> : null}
      </td>
    </tr> : null}
  </>;
}

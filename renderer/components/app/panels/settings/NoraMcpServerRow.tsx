import { useId, useState } from "react";
import { AppMark } from "@/components/app/shared/AppMark";
import { Badge } from "@/components/ui/badge";
import { McpToolsToggle } from "./McpToolsToggle";
import { McpToolDetailsRow } from "./McpToolDetailsRow";
import type { NoraMcpServerRowProps } from "@/components/app/types/runtimeMcp.types";

const CELL_CLASS_NAME = "px-3 py-2 align-middle";
const DETAILS = "Built into Nora and added to each thread as it starts: Nora threads get the app tools, bot threads get ask_bot, list_bots and their own notes, and group chats need none. It runs on this computer only, works with Claude, Codex and ACP agents that support HTTP MCP servers, and needs no setup.";
const AUDIENCE_LABELS = { nora: "Nora threads", bot: "bot threads", member: "bots answering in a group chat" } as const;

/** Nora's own MCP server, which runtimes never report because it is added per thread rather than configured. */
export function NoraMcpServerRow({ status }: NoraMcpServerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  return <>
    <tr className="border-b border-border/40 last:border-0">
      <td className={CELL_CLASS_NAME}><div className="flex min-w-0 items-center gap-2"><AppMark className="size-4 shrink-0" /><span className="font-medium">Nora</span>
        <Badge variant="outline" className="whitespace-nowrap">Built in</Badge></div></td>
      <td className={`${CELL_CLASS_NAME} text-muted-foreground`}>Nora and bot threads</td>
      <td className={`${CELL_CLASS_NAME} text-muted-foreground`}>Global</td>
      <td className={CELL_CLASS_NAME}>{status.status === "running"
        ? <Badge variant="success" className="whitespace-nowrap">Running</Badge>
        : <Badge variant="outline" className="whitespace-nowrap" title="Starts with the first Nora thread">Not started</Badge>}</td>
      <td className={CELL_CLASS_NAME}><McpToolsToggle count={status.tools.length} expanded={expanded} controls={detailsId} serverName="Nora" onToggle={() => setExpanded((value) => !value)} /></td>
      <td className={CELL_CLASS_NAME} />
    </tr>
    {expanded ? <McpToolDetailsRow id={detailsId} message={status.status === "running" ? DETAILS : `${DETAILS} It starts with the first Nora thread.`} tools={status.tools.map((tool) => ({ name: tool.name, description: `${tool.description} (For ${tool.audience.map((entry) => AUDIENCE_LABELS[entry]).join(" and ")}.)` }))} /> : null}
  </>;
}

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { nativeProviderBrands } from "@/components/app/constants/nativeProviderBrands";
import type { McpServerTableRowProps } from "@/components/app/types/runtimeMcp.types";
import { AiProviderLogo } from "@/components/app/views/AiProviderLogo";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { McpServer } from "@shared/types/provider/mcp.types";

const STATUS_BADGES: Readonly<Record<McpServer["status"], { label: string; variant: BadgeProps["variant"] }>> = {
  connected: { label: "Connected", variant: "success" }, pending: { label: "Connecting", variant: "secondary" },
  "needs-auth": { label: "Sign-in required", variant: "warning" }, failed: { label: "Failed", variant: "destructive" },
  disabled: { label: "Disabled", variant: "outline" }, unknown: { label: "Unknown", variant: "outline" }
};
const SCOPE_LABELS: Readonly<Record<McpServer["scope"], string>> = { global: "Global", workspace: "Workspace", unknown: "Unknown" };
const CELL_CLASS_NAME = "px-3 py-2 align-middle";

export function McpServerTableRow({ server, source, onLogin }: McpServerTableRowProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const status = STATUS_BADGES[server.status];
  const hasDetails = server.tools.length > 0 || Boolean(server.message);
  return <>
    <tr className="border-b border-border/40 last:border-0">
      <td className={CELL_CLASS_NAME}>
        <div className="flex min-w-0 items-center gap-2">
          <AiProviderLogo provider={nativeProviderBrands[source.kind]} />
          <span className="break-words font-medium">{server.name}</span>
        </div>
      </td>
      <td className={`${CELL_CLASS_NAME} text-muted-foreground`}>{source.label}</td>
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
        {server.canLogin ? <Button variant="outline" size="sm" onClick={() => onLogin(source, server.name)}>Sign in</Button> : null}
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

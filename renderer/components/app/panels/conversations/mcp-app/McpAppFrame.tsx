import { useState } from "react";
import { buildAllowAttribute } from "@modelcontextprotocol/ext-apps/app-bridge";
import { cn } from "@/lib/utils";
import type { McpAppFrameProps } from "@/components/app/types/mcpApp.types";
import { useMcpAppBridge } from "@/components/app/hooks/useMcpAppBridge";

/**
 * The widget runs in a sandbox without same-origin access, on a single-use origin whose own policy limits its
 * network access to what the server declared. It talks to the thread only through the MCP Apps bridge.
 */
export function McpAppFrame({ call, frame, host, title }: McpAppFrameProps) {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const height = useMcpAppBridge(iframe, frame, call, host);
  return <iframe ref={setIframe} src={frame.url} title={title} sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer"
    allow={buildAllowAttribute(frame.permissions)} style={{ height }}
    className={cn("block w-full rounded-md bg-background", frame.prefersBorder && "border border-border")} />;
}

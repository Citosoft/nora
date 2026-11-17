import { useEffect, useRef, useState } from "react";
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
import { isSpecType } from "@modelcontextprotocol/client";
import type { CallToolResult } from "@modelcontextprotocol/client";
import type { McpAppToolResult } from "@shared/types/conversation/mcpApp.types";
import { APP_VERSION } from "@shared/appMeta";
import type { McpAppFrameSource, McpAppHost, McpAppToolCall } from "@/components/app/types/mcpApp.types";
import { MCP_APP_MAX_HEIGHT, MCP_APP_MIN_HEIGHT, mcpAppHostCapabilities, mcpAppHostContext } from "@/components/app/logic/mcp-app/hostContext";
import { isMcpAppLink, mcpAppMessageText, mcpAppToolArguments, mcpAppToolCancelled, mcpAppToolResult } from "@/components/app/logic/mcp-app/toolCall";
import { useMcpAppTheme } from "./useMcpAppTheme";

function clampHeight(height: number): number {
  return Math.min(MCP_APP_MAX_HEIGHT, Math.max(MCP_APP_MIN_HEIGHT, Math.ceil(height)));
}

function failedCall(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Results come from third-party servers; only shapes the MCP spec accepts are handed to the widget. */
function toCallToolResult(result: McpAppToolResult): CallToolResult {
  return isSpecType.CallToolResult(result) ? { ...result, content: result.content ?? [] } : failedCall("The server returned a result the widget cannot read.");
}

/**
 * Connects one widget frame to the thread with the official MCP Apps host bridge. The bridge lives as long as the
 * frame; the latest call, host and theme are read through refs so transcript updates never reconnect the widget.
 */
export function useMcpAppBridge(iframe: HTMLIFrameElement | null, frame: McpAppFrameSource, call: McpAppToolCall, host: McpAppHost): number {
  const theme = useMcpAppTheme();
  const [height, setHeight] = useState(MCP_APP_MIN_HEIGHT * 2);
  const [bridge, setBridge] = useState<AppBridge | null>(null);
  const latest = useRef({ call, host, theme });
  latest.current = { call, host, theme };
  const sent = useRef({ input: false, result: false });

  useEffect(() => {
    const target = iframe?.contentWindow;
    if (!iframe || !target) return;
    const width = (): number => iframe.getBoundingClientRect().width || iframe.parentElement?.getBoundingClientRect().width || 640;
    const next = new AppBridge(null, { name: "Nora", version: APP_VERSION }, mcpAppHostCapabilities(frame.toolCalls),
      { hostContext: mcpAppHostContext(latest.current.theme, width()) });
    const itemId = latest.current.call.tool.id;
    if (frame.toolCalls) {
      next.oncalltool = async (params) => {
        const args = mcpAppToolArguments(params.arguments);
        if (!args) return failedCall("Tool arguments must be a JSON object.");
        const result = await latest.current.host.callTool(itemId, params.name, args);
        return result.kind === "tool-result" ? toCallToolResult(result.result)
          : failedCall(result.kind === "unavailable" ? result.message : "The tool call could not run.");
      };
    }
    next.onmessage = async (params) => {
      const text = mcpAppMessageText(params.content);
      if (!text) return { isError: true };
      latest.current.host.draftMessage(text);
      return {};
    };
    next.onopenlink = async ({ url }) => {
      if (!isMcpAppLink(url)) return { isError: true };
      latest.current.host.openLink(url);
      return {};
    };
    next.onrequestdisplaymode = async () => ({ mode: "inline" });
    next.addEventListener("sizechange", ({ height: requested }) => { if (requested !== undefined) setHeight(clampHeight(requested)); });
    next.addEventListener("initialized", () => setBridge(next));
    const resize = new ResizeObserver(() => next.setHostContext(mcpAppHostContext(latest.current.theme, width())));
    resize.observe(iframe);
    sent.current = { input: false, result: false };
    void next.connect(new PostMessageTransport(target, target)).catch(() => {});
    return () => {
      resize.disconnect();
      setBridge(null);
      void next.teardownResource({}).catch(() => {}).finally(() => { void next.close(); });
    };
  }, [iframe, frame.url, frame.toolCalls]);

  // Input once the widget is ready, then the result (or cancellation) once the call settles.
  useEffect(() => {
    if (!bridge) return;
    if (!sent.current.input) {
      sent.current.input = true;
      void bridge.sendToolInput({ arguments: call.app.input ?? {} }).catch(() => {});
    }
    if (sent.current.result) return;
    if (mcpAppToolCancelled(call)) {
      sent.current.result = true;
      void bridge.sendToolCancelled({ reason: "The tool call did not finish." }).catch(() => {});
      return;
    }
    const result = mcpAppToolResult(call);
    if (!result) return;
    sent.current.result = true;
    void bridge.sendToolResult(toCallToolResult(result)).catch(() => {});
  }, [bridge, call]);

  useEffect(() => {
    if (!bridge || !iframe) return;
    bridge.setHostContext(mcpAppHostContext(theme, iframe.getBoundingClientRect().width || 640));
  }, [bridge, iframe, theme]);

  return height;
}

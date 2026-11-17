import { randomBytes } from "node:crypto";
import type { McpAppFrame, McpAppFrameServer, McpAppResource } from "@main/types/execution/mcpApp.types";
import { buildMcpAppCsp } from "./mcpAppCsp";

/** A frame must load soon after it is opened; unclaimed documents are dropped. */
const FRAME_LIFETIME_MS = 60_000;
const FRAME_HOST = /^app-([a-f0-9]{32})$/;

/**
 * Widget documents served from `<scheme>://app-<token>/`: a host of their own, so each widget has its own origin
 * and Content-Security-Policy, separate from the renderer's. Each document is served once, then forgotten.
 */
export function createMcpAppFrames(scheme: string, now: () => number = Date.now): McpAppFrameServer {
  const frames = new Map<string, McpAppFrame>();
  const sweep = () => { for (const [token, frame] of frames) if (frame.expiresAt <= now()) frames.delete(token); };
  return {
    register(resource: McpAppResource): string {
      sweep();
      const token = randomBytes(16).toString("hex");
      frames.set(token, { html: resource.html, csp: resource.csp, expiresAt: now() + FRAME_LIFETIME_MS });
      return `${scheme}://app-${token}/`;
    },
    respond(url: URL): Response | null {
      const token = FRAME_HOST.exec(url.host)?.[1];
      if (url.protocol !== `${scheme}:` || !token) return null;
      const frame = frames.get(token);
      frames.delete(token);
      if (!frame || frame.expiresAt <= now() || url.pathname !== "/" || url.username || url.password) {
        return new Response("Not found", { status: 404, headers: { "Content-Security-Policy": "default-src 'none'" } });
      }
      return new Response(frame.html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
        "Content-Security-Policy": buildMcpAppCsp(frame.csp), "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
    }
  };
}

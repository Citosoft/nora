import { useCallback, useEffect, useState } from "react";
import type { McpAppHost, McpAppLoadState } from "@/components/app/types/mcpApp.types";

/**
 * Asks the host to serve the widget. Each frame URL works once, so every mount (and every retry) opens a new one.
 */
export function useMcpAppFrame(host: McpAppHost, itemId: string): { state: McpAppLoadState; retry: () => void } {
  const [state, setState] = useState<McpAppLoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    host.open(itemId).then((result) => {
      if (!current) return;
      if (result.kind === "frame") {
        setState({ status: "ready", frame: { url: result.frameUrl, permissions: result.permissions,
          prefersBorder: result.prefersBorder ?? true, toolCalls: result.toolCalls } });
      } else {
        setState({ status: "unavailable", message: result.kind === "unavailable" ? result.message : "This widget could not be loaded." });
      }
    }, (error: unknown) => {
      if (current) setState({ status: "unavailable", message: error instanceof Error ? error.message : "This widget could not be loaded." });
    });
    return () => { current = false; };
  }, [host, itemId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, retry };
}

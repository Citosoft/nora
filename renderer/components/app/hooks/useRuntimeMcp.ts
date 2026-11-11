import { useCallback, useEffect, useRef, useState } from "react";
import { nativeConversationBridge } from "@/components/app/clients/nativeRuntimeClient";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { McpSelection, RuntimeMcpState } from "@/components/app/types/runtimeMcp.types";
import type { McpAction } from "@shared/types/provider/mcp.types";

export function useRuntimeMcp(selection: McpSelection | null) {
  const [snapshot, setSnapshot] = useState<{ selection: McpSelection | null; state: RuntimeMcpState }>({ selection, state: { status: "loading" } });
  const sequence = useRef(0);
  const request = useCallback(async (action: McpAction): Promise<void> => {
    if (!selection) return;
    const current = ++sequence.current;
    setSnapshot({ selection, state: { status: "loading" } });
    try {
      const result = await nativeConversationBridge.mcp({ ...selection, schemaVersion: 1, action });
      if (sequence.current !== current) return;
      if (result.kind === "login") await noraSystemClient.openExternalUrl(result.authorizationUrl);
      if (sequence.current === current) setSnapshot({ selection, state: { status: "loaded", result } });
    } catch {
      if (sequence.current === current) setSnapshot({ selection, state: { status: "error", message: "MCP connections could not be loaded from this runtime. Check its configuration and refresh." } });
    }
  }, [selection]);
  useEffect(() => { void request({ kind: "list" }); return () => { sequence.current++; }; }, [request]);
  return { state: snapshot.selection === selection ? snapshot.state : { status: "loading" as const },
    refresh: () => request({ kind: "refresh" }), login: (serverName: string) => request({ kind: "login", serverName }) };
}

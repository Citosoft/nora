import { ChevronRight } from "lucide-react";
import type { McpToolsToggleProps } from "@/components/app/types/runtimeMcp.types";

/** Tool count that expands a server's tool list; shared by discovered and built-in server rows. */
export function McpToolsToggle({ count, expanded, controls, serverName, onToggle }: McpToolsToggleProps) {
  return <button type="button" aria-expanded={expanded} aria-controls={controls} onClick={onToggle}
    className="inline-flex items-center gap-1 rounded-[3px] text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <ChevronRight className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
    {count}<span className="sr-only"> tools for {serverName}</span>
  </button>;
}

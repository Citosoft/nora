import type { McpConnectionErrorRowProps } from "@/components/app/types/runtimeMcp.types";

/** Connection failures stay visible even when the tool details are collapsed. */
export function McpConnectionErrorRow({ message }: McpConnectionErrorRowProps) {
  if (!message) return null;
  return <tr className="border-b border-border/40 bg-destructive/5 last:border-0">
    <td colSpan={6} className="px-3 py-2">
      <p role="alert" className="whitespace-pre-wrap break-words text-xs text-destructive">{message}</p>
    </td>
  </tr>;
}

import type { McpToolDetailsRowProps } from "@/components/app/types/runtimeMcp.types";

export function McpToolDetailsRow({ id, message, tools }: McpToolDetailsRowProps) {
  return <tr id={id} className="border-b border-border/40 bg-muted/20 last:border-0">
    <td colSpan={6} className="px-3 py-3 text-xs">
      {message ? <p className="mb-2 text-muted-foreground">{message}</p> : null}
      {tools.length ? <ul className="space-y-2">{tools.map((tool) => <li key={tool.name}>
        <span className="break-words font-medium">{tool.name}</span>
        {tool.description ? <p className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">{tool.description}</p> : null}
      </li>)}</ul> : null}
    </td>
  </tr>;
}

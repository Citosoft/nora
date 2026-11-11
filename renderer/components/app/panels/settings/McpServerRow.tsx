import { Button } from "@/components/ui/button";
import type { McpServerRowProps } from "@/components/app/types/runtimeMcp.types";

export function McpServerRow({ server, onLogin }: McpServerRowProps) {
  const label = { connected: "Connected", pending: "Connecting", "needs-auth": "Sign-in required",
    failed: "Failed", disabled: "Disabled", unknown: "Status unavailable" }[server.status];
  return <div className="rounded-md border border-border/60 bg-background/35 p-3">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><div className="break-words text-sm font-medium">{server.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label} · {server.tools.length} tools</div></div>
      {server.canLogin ? <Button variant="outline" size="sm" onClick={() => onLogin(server.name)}>Sign in</Button> : null}
    </div>
    {server.message ? <p className="mt-2 text-xs text-muted-foreground">{server.message}</p> : null}
    {server.tools.length ? <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground">Available tools</summary>
      <ul className="mt-2 space-y-2">{server.tools.map((tool) => <li key={tool.name}>
        <span className="break-words font-medium">{tool.name}</span>
        {tool.description ? <p className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">{tool.description}</p> : null}
      </li>)}</ul>
    </details> : null}
  </div>;
}

import { LoaderCircle } from "lucide-react";
import type { ThreadConnectorsStatusProps } from "@/components/app/types/threadConnectors.types";
import { ThreadConnectorList } from "./ThreadConnectorList";
import { ThreadConnectorRow } from "./ThreadConnectorRow";

/** What the thread's provider runtime reports: still checking, unavailable, its enabled connectors, or none, plus any notice. */
export function ThreadConnectorsStatus({ connectors, layout }: ThreadConnectorsStatusProps) {
  const { source, summary, logins } = connectors;
  return <div aria-live="polite">
    {summary.status === "loading" ? <p className="flex items-center gap-1.5 text-muted-foreground"><LoaderCircle className="size-3 motion-safe:animate-spin" aria-hidden="true" />Checking {source.label}…</p>
      : summary.status === "unavailable" ? <p className="text-muted-foreground">{summary.message}</p>
      : !summary.servers.length ? <p className="text-muted-foreground">No connectors enabled for {source.label}.</p>
      : layout === "preview" ? <ThreadConnectorList servers={summary.servers} source={source} logins={logins} />
      : <ul className="space-y-1.5">{summary.servers.map((server) => <ThreadConnectorRow key={server.name} server={server} source={source} logins={logins} />)}</ul>}
    {summary.status === "ready" && summary.notice && <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{summary.notice}</p>}
  </div>;
}

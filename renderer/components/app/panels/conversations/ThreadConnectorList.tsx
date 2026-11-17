import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ThreadConnectorListProps } from "@/components/app/types/threadConnectors.types";
import { ThreadConnectorRow } from "./ThreadConnectorRow";

/** Connectors shown inline before the rest move behind a "more" popover, keeping thread details compact. */
const PREVIEW_LIMIT = 4;

export function ThreadConnectorList({ servers, source, logins }: ThreadConnectorListProps) {
  const hidden = servers.length - PREVIEW_LIMIT;
  return <>
    <ul className="space-y-1.5">{servers.slice(0, PREVIEW_LIMIT).map((server) => <ThreadConnectorRow key={server.name} server={server} source={source} logins={logins} />)}</ul>
    {hidden > 0 && <Popover>
      <PopoverTrigger asChild><Button variant="ghost" size="sm" className="mt-1 h-7 px-0 text-[11px] text-muted-foreground hover:text-foreground">
        Show {hidden} more<span className="sr-only"> connectors</span>
      </Button></PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-72 p-0 text-xs" aria-label={`${source.label} connectors`}>
        <p className="border-b border-border/50 px-3 py-2 font-medium">{servers.length} connectors · {source.label}</p>
        <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto px-3 py-2.5">{servers.map((server) => <ThreadConnectorRow key={server.name} server={server} source={source} logins={logins} />)}</ul>
      </PopoverContent>
    </Popover>}
  </>;
}

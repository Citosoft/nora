import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import type { AppConnectorLogosProps } from "@/components/app/types/appsView.types";

/** A compact, overlapping stack of the logos of the connectors an app uses, for rows too narrow for named badges. */
export function AppConnectorLogos({ connectorIds, connectors, max = 3 }: AppConnectorLogosProps) {
  const used = connectorIds.flatMap((id) => connectors.find((connector) => connector.id === id) ?? []);
  if (!used.length) return null;
  const shown = used.slice(0, max);
  const hidden = used.length - shown.length;
  return <span className="flex shrink-0 items-center -space-x-1" title={used.map((connector) => connector.name).join(", ")} aria-hidden="true">
    {shown.map((connector) => <span key={connector.id} className="rounded-[4px] ring-2 ring-background"><McpServerLogo logo={connector.logo} size="small" /></span>)}
    {hidden > 0 ? <span className="relative grid h-4 min-w-4 place-items-center rounded-[4px] bg-muted px-0.5 text-[8px] font-medium tabular-nums text-muted-foreground ring-2 ring-background">+{hidden}</span> : null}
  </span>;
}

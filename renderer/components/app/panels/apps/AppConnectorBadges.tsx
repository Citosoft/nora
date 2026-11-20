import { appSpecConnectorIds } from "@shared/apps/portable";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import type { AppConnectorBadgesProps } from "@/components/app/types/appsView.types";

/** Includes connectors used only by actions, and keeps missing connectors visible rather than silently dropping them. */
export function AppConnectorBadges({ spec, connectors }: AppConnectorBadgesProps) {
  const ids = appSpecConnectorIds(spec);
  if (!ids.length) return <p className="truncate text-xs text-muted-foreground">No connectors</p>;
  if (!connectors) return <p role="status" className="truncate text-xs text-muted-foreground">Loading connectors…</p>;
  return <div className="flex min-w-0 items-center gap-2">
    <span className="shrink-0 text-xs text-muted-foreground">Uses</span>
    <ul aria-label="Connectors used by this app" tabIndex={0} className="flex min-w-0 gap-1.5 overflow-x-auto rounded-md [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-scrollbar]:hidden">
      {ids.map((id) => {
        const connector = connectors.find((entry) => entry.id === id);
        return <li key={id} title={connector?.name ?? "Unavailable connector"} className="flex min-w-0 max-w-48 shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-xs">
          <McpServerLogo logo={connector?.logo} size="small" />
          <span className={connector ? "truncate" : "truncate text-destructive"}>{connector?.name ?? "Unavailable connector"}</span>
        </li>;
      })}
    </ul>
  </div>;
}

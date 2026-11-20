import { ChevronRight } from "lucide-react";
import type { AppsHomeGridProps } from "@/components/app/types/appsView.types";
import { AppIcon } from "./AppIcon";

const UPDATED_FORMAT = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

/** The apps already built, as cards that open them. */
export function AppsHomeGrid({ apps, onOpen }: AppsHomeGridProps) {
  return <section aria-labelledby="your-apps-heading">
    <div className="mb-3 flex items-baseline gap-2">
      <h2 id="your-apps-heading" className="text-sm font-semibold">Your apps</h2>
      <span className="text-xs tabular-nums text-muted-foreground">{apps.length}</span>
    </div>
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{apps.map((app) => <li key={app.id}>
      <button type="button" onClick={() => onOpen(app.id)}
        className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left shadow-sm transition hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-foreground/80"><AppIcon icon={app.icon} className="size-[18px]" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{app.name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">v{app.version} · Updated {UPDATED_FORMAT.format(new Date(app.updatedAt))}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition group-hover:translate-x-0.5 group-hover:text-muted-foreground" aria-hidden="true" />
      </button></li>)}</ul>
  </section>;
}

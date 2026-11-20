import { ArrowUpRight } from "lucide-react";
import { APP_STARTERS } from "@/components/app/constants/appStarters";
import type { AppStarterGridProps } from "@/components/app/types/appsView.types";
import { AppIcon } from "./AppIcon";

/** Example apps to start from; picking one fills the description to edit. */
export function AppStarterGrid({ onPick }: AppStarterGridProps) {
  return <section aria-labelledby="app-starters-heading">
    <h2 id="app-starters-heading" className="mb-3 text-xs font-medium text-muted-foreground">Or start from an example</h2>
    <ul className="grid gap-3 sm:grid-cols-3">{APP_STARTERS.map((starter) => <li key={starter.id}>
      <button type="button" onClick={() => onPick(starter.text)}
        className="group flex h-full w-full items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-3.5 text-left transition hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><AppIcon icon={starter.icon} className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2 text-sm font-medium">{starter.label}
            <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" /></span>
          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{starter.description}</span>
        </span>
      </button></li>)}</ul>
  </section>;
}

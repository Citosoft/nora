import { UpdateStatusBadge } from "@/components/app/dialogs/about/UpdateStatusBadge";
import { AppMark } from "@/components/app/shared/AppMark";
import type { AboutHeroProps } from "@/components/app/types/aboutDialog.types";
import { APP_DESCRIPTION, APP_NAME } from "@shared/appMeta";

export function AboutHero({ summary }: AboutHeroProps) {
  return (
    <div className="relative flex flex-col items-center px-6 pb-6 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 h-44 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />
      <AppMark className="relative size-16 drop-shadow-md" />
      <h2 className="relative mt-4 text-xl font-semibold tracking-tight text-foreground">{APP_NAME}</h2>
      <p className="relative mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{APP_DESCRIPTION}</p>
      <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs text-foreground">
          v{summary.installedVersion}
        </span>
        <UpdateStatusBadge summary={summary} />
      </div>
      {summary.detail ? (
        <p className="relative mt-2 max-w-sm text-xs text-muted-foreground">{summary.detail}</p>
      ) : null}
    </div>
  );
}

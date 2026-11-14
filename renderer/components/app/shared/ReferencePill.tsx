import type { ReferencePillProps } from "@/components/app/types/referencePill.types";

export function ReferencePill({ icon, title, children }: ReferencePillProps) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 align-baseline text-xs font-medium leading-5 text-foreground" title={title}>
    <span aria-hidden="true" className="inline-flex size-3.5 shrink-0 items-center justify-center [&>svg]:size-full">{icon}</span>{children}
  </span>;
}

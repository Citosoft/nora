import type { AboutLinkRowProps } from "@/components/app/types/aboutDialog.types";

export function AboutLinkRow({ icon: Icon, title, description, action }: AboutLinkRowProps) {
  return (
    <div className="flex items-center gap-3 bg-background px-4 py-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

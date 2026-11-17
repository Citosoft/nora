import { LoaderCircle } from "lucide-react";
import type { SidebarIconActionProps } from "@/components/app/types/changesPanelSections.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Compact ghost action with a tooltip and an optional pending count, e.g. commits to push. */
export function SidebarIconAction({ label, icon, busy, disabled, count, pressed, onClick }: SidebarIconActionProps) {
  return <Button type="button" variant="ghost" size="sm" tooltip={label} aria-label={label} disabled={disabled || busy} onClick={onClick} aria-pressed={pressed}
    className={cn("h-7 gap-1 px-1.5 text-[11px] tabular-nums text-muted-foreground hover:text-foreground", pressed && "bg-secondary text-foreground")}>
    {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : icon}
    {count ? <span>{count}</span> : null}
  </Button>;
}

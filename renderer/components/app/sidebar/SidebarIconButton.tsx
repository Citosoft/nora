import { Button } from "@/components/ui/button";
import type { SidebarIconButtonProps } from "@/components/app/types/sidebarNavigation.types";

export function SidebarIconButton({ label, icon: Icon, active, onSelect }: SidebarIconButtonProps) {
  return <Button type="button" variant="ghost" size="icon" aria-label={label} aria-pressed={active} tooltip={label}
    onClick={onSelect} className={`size-9 shrink-0 ${active ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
    <Icon className="size-5" aria-hidden="true" />
  </Button>;
}

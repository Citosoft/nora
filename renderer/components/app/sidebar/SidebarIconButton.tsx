import { Button } from "@/components/ui/button";
import type { SidebarIconButtonProps } from "@/components/app/types/sidebarNavigation.types";

export function SidebarIconButton({ label, icon: Icon, active, badge = 0, onSelect }: SidebarIconButtonProps) {
  const name = badge > 0 ? `${label}, ${badge} waiting` : label;
  return <Button type="button" variant="ghost" size="icon" aria-label={name} aria-pressed={active} tooltip={name}
    onClick={onSelect} className={`relative size-9 shrink-0 ${active ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
    <Icon className="size-5" aria-hidden="true" />
    {badge > 0 && <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold tabular-nums leading-none text-white">
      {badge > 99 ? "99+" : badge}</span>}
  </Button>;
}

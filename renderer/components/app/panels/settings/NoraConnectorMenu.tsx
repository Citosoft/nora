import type { NoraConnectorMenuProps } from "@/components/app/types/noraConnectors.types";
import { Button } from "@/components/ui/button";
import { PopoverMenu, PopoverMenuItem } from "@/components/ui/popover-menu";

export function NoraConnectorMenu({ label, busy, icon, items }: NoraConnectorMenuProps) {
  return <PopoverMenu label={label} trigger={<Button variant="ghost" size="icon" className="size-7" aria-label={label} disabled={busy}>{icon}</Button>}>
    {items.map((item) => <PopoverMenuItem key={item.label} destructive={item.destructive} onSelect={item.run}>{item.label}</PopoverMenuItem>)}
  </PopoverMenu>;
}

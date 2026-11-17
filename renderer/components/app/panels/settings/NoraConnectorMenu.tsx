import { useState } from "react";
import type { NoraConnectorMenuProps } from "@/components/app/types/noraConnectors.types";
import { Button } from "@/components/ui/button";
import { menuItemClass, menuItemDestructiveClass, menuSurfaceClass } from "@/components/ui/menu-styles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Radix popover rather than the portal-only dropdown: Settings is a modal dialog that turns off pointer events outside its
 * layers, and only a Radix layer stays clickable above it.
 */
export function NoraConnectorMenu({ label, busy, icon, items }: NoraConnectorMenuProps) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="size-7" aria-label={label} disabled={busy}>{icon}</Button></PopoverTrigger>
    <PopoverContent align="end" sideOffset={4} className={cn("z-[10000] w-52", menuSurfaceClass)} aria-label={label}>
      {items.map((item) => <button key={item.label} type="button"
        className={cn(menuItemClass, item.destructive && menuItemDestructiveClass)}
        onClick={() => { setOpen(false); item.run(); }}>{item.label}</button>)}
    </PopoverContent>
  </Popover>;
}

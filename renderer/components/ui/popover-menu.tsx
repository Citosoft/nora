import { createContext, useContext, useState } from "react";
import type { PopoverMenuContextValue, PopoverMenuItemProps, PopoverMenuProps } from "@/components/ui/types/primitives.types";
import { menuItemClass, menuItemDestructiveClass, menuItemDisabledClass, menuSurfaceClass } from "@/components/ui/menu-styles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PopoverMenuContext = createContext<PopoverMenuContextValue | null>(null);

/**
 * A menu on a Radix popover layer, for use inside modal dialogs such as Settings. A Radix modal turns off pointer events
 * outside its own layers and treats clicks elsewhere as dismissing it, so the portal-only `DropdownMenu` shows there but
 * can't be used; a Radix layer stacks above the dialog and stays interactive.
 */
export function PopoverMenu({ trigger, label, children, align = "end", widthClassName = "w-52" }: PopoverMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} sideOffset={6} aria-label={label} className={cn("z-[10000] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto", menuSurfaceClass, widthClassName)}>
        <PopoverMenuContext.Provider value={{ close: () => setOpen(false) }}>{children}</PopoverMenuContext.Provider>
      </PopoverContent>
    </Popover>
  );
}

export function PopoverMenuItem({ children, destructive = false, disabled = false, className, onSelect }: PopoverMenuItemProps) {
  const context = useContext(PopoverMenuContext);
  return (
    <button type="button" disabled={disabled}
      className={cn(menuItemClass, destructive && menuItemDestructiveClass, disabled && menuItemDisabledClass, className)}
      onClick={() => { context?.close(); onSelect?.(); }}>
      {children}
    </button>
  );
}

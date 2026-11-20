import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { menuItemClass, menuItemDestructiveClass, menuLabelClass, menuSeparatorClass, menuSurfaceClass } from "@/components/ui/menu-styles";
import type { MenuCheckboxItemProps, MenuLabelProps } from "@/components/ui/types/primitives.types";
import { cn } from "@/lib/utils";

export type ContextMenuProps = {
  children: ReactNode;
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ContextMenu({
  children,
  modal = false,
  onOpenChange
}: ContextMenuProps) {
  return (
    <ContextMenuPrimitive.Root onOpenChange={onOpenChange} modal={modal}>
      {children}
    </ContextMenuPrimitive.Root>
  );
}

export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export type ContextMenuContentProps = {
  children: ReactNode;
  className?: string;
};

export function ContextMenuContent({
  children,
  className
}: ContextMenuContentProps) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cn(
          "z-[10020] min-w-52 overflow-hidden",
          menuSurfaceClass,
          className
        )}
      >
        {children}
      </ContextMenuPrimitive.Content>
    </ContextMenuPrimitive.Portal>
  );
}

export type ContextMenuItemProps = {
  children: ReactNode;
  destructive?: boolean;
  className?: string;
  disabled?: boolean;
  onSelect?: () => void;
};

export function ContextMenuItem({
  children,
  destructive = false,
  className,
  disabled = false,
  onSelect
}: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        menuItemClass,
        destructive && menuItemDestructiveClass,
        className
      )}
    >
      {children}
    </ContextMenuPrimitive.Item>
  );
}

export function ContextMenuLabel({ children }: MenuLabelProps) {
  return <ContextMenuPrimitive.Label className={menuLabelClass}>{children}</ContextMenuPrimitive.Label>;
}

export function ContextMenuSeparator() {
  return <ContextMenuPrimitive.Separator className={menuSeparatorClass} />;
}

export function ContextMenuCheckboxItem({ children, checked, disabled = false, onCheckedChange }: MenuCheckboxItemProps) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      onSelect={(event) => event.preventDefault()}
      className={cn(menuItemClass, "pl-8")}
    >
      <ContextMenuPrimitive.ItemIndicator className="absolute left-2 flex size-4 items-center justify-center">
        <Check className="size-3.5" aria-hidden="true" />
      </ContextMenuPrimitive.ItemIndicator>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

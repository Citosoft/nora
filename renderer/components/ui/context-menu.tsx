import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import type { ReactNode } from "react";
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
          "z-[10020] min-w-52 overflow-hidden rounded-[7px] border border-border/70 bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur",
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
        "relative flex w-full select-none items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[12px] outline-none transition",
        "data-[highlighted]:bg-accent/60 data-[highlighted]:text-popover-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        destructive ? "text-destructive data-[highlighted]:text-destructive" : "text-popover-foreground",
        className
      )}
    >
      {children}
    </ContextMenuPrimitive.Item>
  );
}

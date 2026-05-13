import type { DropdownMenuItemProps, DropdownMenuProps } from "@/components/ui/types/primitives.types";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  widthClassName = "w-52"
}: DropdownMenuProps) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const viewportPadding = 16;
      const gap = 6;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const shouldOpenUpward = spaceBelow < 240 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, shouldOpenUpward ? spaceAbove - gap : spaceBelow - gap);

      setPosition({
        top: shouldOpenUpward ? Math.max(viewportPadding, rect.top - gap) : rect.bottom + gap,
        left: align === "start" ? rect.left : rect.right,
        maxHeight
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!triggerRef.current?.contains(target) && !contentRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [align, open]);

  useEffect(() => {
    if (!open || !position || !contentRef.current) {
      return;
    }

    const viewportPadding = 16;
    const menuRect = contentRef.current.getBoundingClientRect();
    const leftOverflow = viewportPadding - menuRect.left;
    const rightOverflow = menuRect.right - (window.innerWidth - viewportPadding);
    const horizontalDelta =
      leftOverflow > 0
        ? leftOverflow
        : rightOverflow > 0
          ? -rightOverflow
          : 0;

    if (Math.abs(horizontalDelta) < 0.5) {
      return;
    }

    setPosition((current) =>
      current
        ? {
            ...current,
            left: current.left + horizontalDelta
          }
        : current
    );
  }, [open, position]);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        {trigger}
      </div>
      {open && position
        ? createPortal(
            <div
              ref={contentRef}
              className={cn(
                "fixed z-[9999] overflow-y-auto rounded-[7px] border border-border/70 bg-popover/95 p-1 shadow-xl backdrop-blur",
                widthClassName
              )}
              style={{
                top: position.top,
                left: position.left,
                maxHeight: position.maxHeight,
                transform: `${align === "end" ? "translateX(-100%) " : ""}${position.top <= (triggerRef.current?.getBoundingClientRect().top || 0) ? "translateY(-100%)" : ""}`.trim() || undefined
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenuContext.Provider value={{ close: () => setOpen(false) }}>
                {children}
              </DropdownMenuContext.Provider>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

const DropdownMenuContext = React.createContext<{ close: () => void } | null>(null);

export function DropdownMenuItem({
  children,
  destructive = false,
  className,
  onSelect
}: DropdownMenuItemProps) {
  const context = React.useContext(DropdownMenuContext);

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[12px] transition hover:bg-accent/60",
        destructive ? "text-destructive" : "text-popover-foreground",
        className
      )}
      onClick={() => {
        onSelect?.();
        context?.close();
      }}
    >
      {children}
    </button>
  );
}

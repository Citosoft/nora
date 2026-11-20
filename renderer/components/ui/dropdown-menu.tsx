import type { DropdownMenuContextValue, DropdownMenuGroupProps, DropdownMenuItemProps, DropdownMenuProps, DropdownMenuSubProps, MenuCheckboxItemProps, MenuLabelProps } from "@/components/ui/types/primitives.types";
import { menuItemClass, menuItemDestructiveClass, menuItemDisabledClass, menuLabelClass, menuSeparatorClass, menuSurfaceClass } from "@/components/ui/menu-styles";
import { cn } from "@/lib/utils";
import * as React from "react";
import { Check, ChevronRight } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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
  const [openSubId, setOpenSubId] = useState<string | null>(null);
  const layerId = useId();
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

      // Submenus render in their own portals, so they are matched by layer instead of DOM containment.
      const element = target instanceof Element ? target : target.parentElement;
      const inSubmenu = element?.closest(`[data-dropdown-layer="${CSS.escape(layerId)}"]`) != null;
      if (!triggerRef.current?.contains(target) && !contentRef.current?.contains(target) && !inSubmenu) {
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
  }, [align, layerId, open]);

  useEffect(() => {
    if (!open) setOpenSubId(null);
  }, [open]);

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
                "fixed z-[9999] overflow-y-auto",
                menuSurfaceClass,
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
              <DropdownMenuContext.Provider value={{ close: () => setOpen(false), layerId, openSubId, setOpenSubId }}>
                {children}
              </DropdownMenuContext.Provider>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

export function DropdownMenuItem({
  children,
  destructive = false,
  disabled = false,
  className,
  onSelect
}: DropdownMenuItemProps) {
  const context = React.useContext(DropdownMenuContext);

  return (
    <button
      type="button"
      className={cn(
        menuItemClass,
        destructive && menuItemDestructiveClass,
        disabled && menuItemDisabledClass,
        className
      )}
      disabled={disabled}
      onMouseEnter={() => context?.setOpenSubId(null)}
      onClick={() => {
        if (disabled) {
          return;
        }
        onSelect?.();
        context?.close();
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuCheckboxItem({ children, checked, disabled = false, onCheckedChange }: MenuCheckboxItemProps) {
  const context = React.useContext(DropdownMenuContext);

  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      className={cn(menuItemClass, "pl-8", disabled && menuItemDisabledClass)}
      disabled={disabled}
      onMouseEnter={() => context?.setOpenSubId(null)}
      onClick={() => onCheckedChange(!checked)}
    >
      {checked && <Check className="absolute left-2 !size-3.5 !text-popover-foreground" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children }: MenuLabelProps) {
  return <div aria-hidden="true" className={menuLabelClass}>{children}</div>;
}

export function DropdownMenuSeparator() {
  return <div role="separator" className={menuSeparatorClass} />;
}

/** Labelled section; a top-level group draws a separator above itself unless it opens the menu. */
export function DropdownMenuGroup({ label, children, nested = false }: DropdownMenuGroupProps) {
  return (
    <div role="group" aria-label={label}>
      {!nested && <div role="separator" className={cn(menuSeparatorClass, "[:first-child>&]:hidden")} />}
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {children}
    </div>
  );
}

const submenuGap = 4;
const submenuViewportPadding = 16;

/** Item that pops out a nested menu to the side on hover, click or ArrowRight. */
export function DropdownMenuSub({ label, icon, children, disabled = false }: DropdownMenuSubProps) {
  const context = React.useContext(DropdownMenuContext);
  const subId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const open = context?.openSubId === subId;

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    const panel = panelRef.current;
    if (!rect || !panel) {
      return;
    }
    const fitsRight = rect.right + submenuGap + panel.offsetWidth <= window.innerWidth - submenuViewportPadding;
    const left = fitsRight ? rect.right + submenuGap : Math.max(submenuViewportPadding, rect.left - submenuGap - panel.offsetWidth);
    const bottomLimit = window.innerHeight - submenuViewportPadding - panel.offsetHeight;
    setPosition({ left, top: Math.max(submenuViewportPadding, Math.min(rect.top - submenuGap, bottomLimit)) });
  }, [open]);

  const setOpen = (next: boolean) => context?.setOpenSubId(next ? subId : null);
  const focusFirstItem = () => requestAnimationFrame(() => panelRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus());

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        className={cn(menuItemClass, open && "bg-accent/70 [&>svg]:text-popover-foreground", disabled && menuItemDisabledClass)}
        onMouseEnter={() => { if (!disabled) setOpen(true); }}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" && !disabled) {
            event.preventDefault();
            setOpen(true);
            focusFirstItem();
          }
        }}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronRight className="!size-3.5 opacity-70" aria-hidden="true" />
      </button>
      {open && context
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              aria-label={label}
              data-dropdown-layer={context.layerId}
              className={cn("fixed z-[10000] w-56 overflow-y-auto", menuSurfaceClass)}
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                maxHeight: window.innerHeight - submenuViewportPadding * 2,
                visibility: position ? undefined : "hidden"
              }}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  setOpen(false);
                  triggerRef.current?.focus();
                }
              }}
            >
              {/* Hovering this submenu's own items must not reset it, so only opening another submenu is forwarded. */}
              <DropdownMenuContext.Provider value={{ ...context, setOpenSubId: (id) => { if (id !== null) context.setOpenSubId(id); } }}>
                {children}
              </DropdownMenuContext.Provider>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

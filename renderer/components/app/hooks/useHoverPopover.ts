import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { HoverPopoverControls, HoverPopoverOptions } from "@/components/app/types/hoverPopover.types";

const DEFAULT_CLOSE_DELAY_MS = 150;

/**
 * Opens a Radix popover on mouse hover while keeping click and keyboard toggling. Hover-opened popovers
 * leave focus on the trigger and close when the pointer leaves unless clicked to pin; keyboard-opened ones
 * move focus into the content as usual.
 */
export function useHoverPopover({ closeDelayMs = DEFAULT_CLOSE_DELAY_MS, onOpen }: HoverPopoverOptions = {}): HoverPopoverControls {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const openedByHover = useRef(false);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const openRef = useRef(open);
  openRef.current = open;

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  useEffect(() => cancelClose, [cancelClose]);

  const onOpenChange = useCallback((next: boolean) => {
    cancelClose();
    if (next) { openedByHover.current = false; onOpenRef.current?.(); }
    setOpen(next);
  }, [cancelClose]);

  const pointerProps = useMemo(() => ({
    onPointerEnter(event: ReactPointerEvent<HTMLElement>) {
      if (event.pointerType !== "mouse") return;
      cancelClose();
      if (openRef.current) return;
      openedByHover.current = true;
      onOpenRef.current?.();
      setOpen(true);
    },
    onPointerLeave(event: ReactPointerEvent<HTMLElement>) {
      if (event.pointerType !== "mouse" || !openedByHover.current) return;
      cancelClose();
      closeTimer.current = window.setTimeout(() => { closeTimer.current = null; setOpen(false); }, closeDelayMs);
    }
  }), [cancelClose, closeDelayMs]);

  return {
    open,
    onOpenChange,
    triggerProps: {
      ...pointerProps,
      // Clicking a hover-opened popover pins it open instead of letting Radix toggle it shut.
      onClick(event) {
        if (!openRef.current || !openedByHover.current) return;
        event.preventDefault();
        cancelClose();
        openedByHover.current = false;
      }
    },
    contentProps: { ...pointerProps, onOpenAutoFocus(event) { if (openedByHover.current) event.preventDefault(); } }
  };
}

import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

export interface HoverPopoverOptions {
  /** Delay before closing once the pointer leaves, so it can travel from trigger to content. */
  closeDelayMs?: number;
  onOpen?(): void;
}

export interface HoverPopoverPointerProps {
  onPointerEnter(event: ReactPointerEvent<HTMLElement>): void;
  onPointerLeave(event: ReactPointerEvent<HTMLElement>): void;
}

export interface HoverPopoverControls {
  open: boolean;
  onOpenChange(open: boolean): void;
  triggerProps: HoverPopoverPointerProps & { onClick(event: ReactMouseEvent<HTMLElement>): void };
  contentProps: HoverPopoverPointerProps & { onOpenAutoFocus(event: Event): void };
}

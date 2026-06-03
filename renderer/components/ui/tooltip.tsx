import { cn } from "@/lib/utils";
import { type PropsWithChildren, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function Tooltip({
  content,
  children,
  className,
  side = "bottom",
  sideOffset = 8,
  followCursor = false
}: PropsWithChildren<{ content: ReactNode; className?: string; side?: "top" | "right" | "bottom" | "left"; sideOffset?: number; followCursor?: boolean }>) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const GAP = sideOffset;
    const VIEWPORT_PADDING = 8;

    const computePosition = (
      preferredSide: "top" | "right" | "bottom" | "left",
      triggerRect: DOMRect,
      tooltipWidth: number,
      tooltipHeight: number
    ): { left: number; top: number } => {
      switch (preferredSide) {
        case "top":
          return {
            left: triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2,
            top: triggerRect.top - tooltipHeight - GAP
          };
        case "left":
          return {
            left: triggerRect.left - tooltipWidth - GAP,
            top: triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2
          };
        case "right":
          return {
            left: triggerRect.right + GAP,
            top: triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2
          };
        default:
          return {
            left: triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2,
            top: triggerRect.bottom + GAP
          };
      }
    };

    const resolveSide = (
      preferredSide: "top" | "right" | "bottom" | "left",
      triggerRect: DOMRect,
      tooltipWidth: number,
      tooltipHeight: number
    ): "top" | "right" | "bottom" | "left" => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const initial = computePosition(preferredSide, triggerRect, tooltipWidth, tooltipHeight);

      if (preferredSide === "right" && initial.left + tooltipWidth > viewportWidth - VIEWPORT_PADDING) {
        return "left";
      }
      if (preferredSide === "left" && initial.left < VIEWPORT_PADDING) {
        return "right";
      }
      if (preferredSide === "top" && initial.top < VIEWPORT_PADDING) {
        return "bottom";
      }
      if (preferredSide === "bottom" && initial.top + tooltipHeight > viewportHeight - VIEWPORT_PADDING) {
        return "top";
      }

      return preferredSide;
    };

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) {
        return;
      }

      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      const tooltipWidth = tooltipRect?.width ?? 260;
      const tooltipHeight = tooltipRect?.height ?? 40;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const rectForPositioning = followCursor && cursorPoint
        ? ({
            left: cursorPoint.x,
            right: cursorPoint.x,
            top: cursorPoint.y,
            bottom: cursorPoint.y,
            width: 0,
            height: 0
          } as DOMRect)
        : triggerRect;

      const resolvedSide = resolveSide(side, rectForPositioning, tooltipWidth, tooltipHeight);
      const next = computePosition(resolvedSide, rectForPositioning, tooltipWidth, tooltipHeight);
      setPosition({
        left: Math.min(Math.max(next.left, VIEWPORT_PADDING), viewportWidth - tooltipWidth - VIEWPORT_PADDING),
        top: Math.min(Math.max(next.top, VIEWPORT_PADDING), viewportHeight - tooltipHeight - VIEWPORT_PADDING)
      });
    };

    updatePosition();
    const frameId = window.requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [content, open, side, sideOffset, followCursor, cursorPoint]);

  return (
    <>
      <div
        ref={triggerRef}
        className="min-w-0"
        onMouseEnter={(event) => {
          if (followCursor) {
            setCursorPoint({ x: event.clientX, y: event.clientY });
          }
          setOpen(true);
        }}
        onMouseMove={(event) => {
          if (!followCursor) {
            return;
          }
          setCursorPoint({ x: event.clientX, y: event.clientY });
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </div>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              className={cn(
                "pointer-events-none fixed z-[40000] inline-block w-fit max-w-[22rem] rounded-[5px] border border-border/70 bg-popover/95 px-2.5 py-1.5 text-xs text-popover-foreground shadow-xl whitespace-pre-wrap break-words [overflow-wrap:anywhere] dark:border-white/15 dark:bg-zinc-200 dark:text-zinc-950",
                className
              )}
              style={{
                left: position.left,
                top: position.top
              }}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

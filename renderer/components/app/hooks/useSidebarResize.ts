import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

export type UseSidebarResizeArgs = {
  workspaceSidebarWidth: number;
  changesSidebarWidth: number;
  setWorkspaceSidebarWidth: (value: number) => void;
  setChangesSidebarWidth: (value: number) => void;
  setIsWorkspaceSidebarCollapsed: (value: boolean) => void;
  setIsChangesSidebarCollapsed: (value: boolean) => void;
  minWorkspaceSidebarWidth: number;
  maxWorkspaceSidebarWidth: number;
  minChangesSidebarWidth: number;
  maxChangesSidebarWidth: number;
  workspaceSidebarAutoCollapseWidth: number;
  changesSidebarAutoCollapseWidth: number;
  /** When true, workspace is on the right and Changes on the left; drag deltas are inverted per edge. */
  sidebarsSwapped: boolean;
};

function clampSidebarWidth(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function useSidebarResize({
  workspaceSidebarWidth,
  changesSidebarWidth,
  setWorkspaceSidebarWidth,
  setChangesSidebarWidth,
  setIsWorkspaceSidebarCollapsed,
  setIsChangesSidebarCollapsed,
  minWorkspaceSidebarWidth,
  maxWorkspaceSidebarWidth,
  minChangesSidebarWidth,
  maxChangesSidebarWidth,
  workspaceSidebarAutoCollapseWidth,
  changesSidebarAutoCollapseWidth,
  sidebarsSwapped
}: UseSidebarResizeArgs): { startSidebarResize: (side: "left" | "right", event: ReactPointerEvent<HTMLDivElement>) => void } {
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    if (resizeCleanupRef.current) {
      resizeCleanupRef.current();
    }
  }, []);

  const startSidebarResize = useCallback((side: "left" | "right", event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();

    resizeCleanupRef.current?.();
    const startX = event.clientX;
    const startWidth = side === "left" ? workspaceSidebarWidth : changesSidebarWidth;
    let latestRawWidth = startWidth;
    let animationFrameId: number | null = null;

    const applyLatestWidth = () => {
      animationFrameId = null;
      const clampedWidth = side === "left"
        ? clampSidebarWidth(latestRawWidth, minWorkspaceSidebarWidth, maxWorkspaceSidebarWidth)
        : clampSidebarWidth(latestRawWidth, minChangesSidebarWidth, maxChangesSidebarWidth);
      const shouldCollapse = side === "left"
        ? latestRawWidth <= workspaceSidebarAutoCollapseWidth
        : latestRawWidth <= changesSidebarAutoCollapseWidth;

      if (side === "left") {
        if (shouldCollapse) {
          setIsWorkspaceSidebarCollapsed(true);
          return;
        }
        setWorkspaceSidebarWidth(clampedWidth);
        setIsWorkspaceSidebarCollapsed(false);
        return;
      }

      if (shouldCollapse) {
        setIsChangesSidebarCollapsed(true);
        return;
      }
      setChangesSidebarWidth(clampedWidth);
      setIsChangesSidebarCollapsed(false);
    };

    const workspaceDeltaSign = sidebarsSwapped ? -1 : 1;
    const changesDeltaSign = sidebarsSwapped ? 1 : -1;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      latestRawWidth =
        side === "left" ? startWidth + workspaceDeltaSign * delta : startWidth + changesDeltaSign * delta;
      if (animationFrameId === null) {
        animationFrameId = window.requestAnimationFrame(applyLatestWidth);
      }
    };

    const stopResizing = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
      window.removeEventListener("blur", stopResizing);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      applyLatestWidth();
      resizeCleanupRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    resizeCleanupRef.current = stopResizing;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
    window.addEventListener("blur", stopResizing);
  }, [
    changesSidebarAutoCollapseWidth,
    changesSidebarWidth,
    maxChangesSidebarWidth,
    maxWorkspaceSidebarWidth,
    minChangesSidebarWidth,
    minWorkspaceSidebarWidth,
    setChangesSidebarWidth,
    setIsChangesSidebarCollapsed,
    setIsWorkspaceSidebarCollapsed,
    setWorkspaceSidebarWidth,
    workspaceSidebarAutoCollapseWidth,
    workspaceSidebarWidth,
    sidebarsSwapped
  ]);

  return {
    startSidebarResize
  };
}

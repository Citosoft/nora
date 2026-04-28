import type { ToolPopoverState } from "@/components/app/types";

export function getNextToolPopoverState(
  current: ToolPopoverState | null,
  toolId: string,
  rect: DOMRect
): ToolPopoverState | null {
  if (current?.toolId === toolId) {
    return null;
  }

  const popoverWidth = 980;
  const gap = 12;
  const left = Math.min(rect.right + gap, window.innerWidth - popoverWidth - 16);
  const top = Math.min(rect.top, window.innerHeight - 320);

  return {
    toolId,
    top: Math.max(56, top),
    left: Math.max(16, left)
  };
}

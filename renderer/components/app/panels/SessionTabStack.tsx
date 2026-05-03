import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Single stacking context for session center content. Children are absolutely
 * stacked; each child should be a {@link SessionTabPane} (or equivalent) so
 * switching the active tab only changes visibility — DOM is not torn down.
 */
export function SessionTabStack({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}>{children}</div>
  );
}

type SessionTabPaneProps = {
  /** When true, this pane is shown; when false, it stays mounted but is non-interactive and visually hidden. */
  visible: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * One layer in a {@link SessionTabStack}. Same idea as a classic tab panel:
 * inactive tabs are hidden with CSS, not unmounted.
 */
export function SessionTabPane({ visible, children, className }: SessionTabPaneProps) {
  return (
    <div
      role="tabpanel"
      aria-hidden={!visible}
      className={cn(
        "absolute inset-0 flex min-h-0 flex-col overflow-hidden",
        visible ? "z-20 opacity-100" : "pointer-events-none z-10 opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}

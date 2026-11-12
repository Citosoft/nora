import type { DevToastVariant } from "@/components/app/types/settings.types";

export type AppToastDownloadProgress =
  | { mode: "determinate"; percent: number }
  | { mode: "indeterminate" };

/** Screen corner a toast stacks in; each corner is its own toast region. */
export type AppToastPlacement = "bottom-right" | "bottom-left";

/** `compact` trims padding and type and puts the action beside the text, for low-priority notices. */
export type AppToastDensity = "comfortable" | "compact";

/** Replaces the variant glyph with a specific subject's icon. */
export type AppToastIcon = { kind: "agent-tool"; toolId: string; label: string };

export type AppToastPrimaryAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
};

export type AppToast = {
  id: number;
  title: string;
  description?: string;
  variant: DevToastVariant;
  downloadProgress?: AppToastDownloadProgress;
  primaryAction?: AppToastPrimaryAction;
  icon?: AppToastIcon;
  /** Shows an explicit dismiss button with this accessible label; swipe-to-dismiss works regardless. */
  dismissLabel?: string;
  /** Auto-dismiss delay; omit for the toast provider default. */
  durationMs?: number;
  /** Defaults to `bottom-right`. */
  placement?: AppToastPlacement;
  /** Defaults to `comfortable`. */
  density?: AppToastDensity;
  /** Called when this toast is removed (swipe away, close, or programmatic dismiss). */
  onDismissed?: (toastId: number) => void;
};

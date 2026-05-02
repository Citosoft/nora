import type { DevToastVariant } from "@/components/app/types/settings.types";

export type AppToastDownloadProgress =
  | { mode: "determinate"; percent: number }
  | { mode: "indeterminate" };

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
  /** Called when this toast is removed (swipe away, close, or programmatic dismiss). */
  onDismissed?: (toastId: number) => void;
};

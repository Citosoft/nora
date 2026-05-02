import type { AppToast } from "@/components/app/types/appToast.types";
import { Button } from "@/components/ui/button";
import { Toast, ToastDescription, ToastTitle } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  LoaderCircle,
  RefreshCw
} from "lucide-react";

const ToastVariantIcon = ({ variant }: { variant: AppToast["variant"] }) => {
  if (variant === "success") {
    return (
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/18 text-white"
        aria-hidden
      >
        <CheckCircle2 className="size-4 stroke-2" />
      </div>
    );
  }
  if (variant === "error") {
    return (
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive-foreground/[0.14] text-destructive-foreground"
        aria-hidden
      >
        <AlertCircle className="size-4 stroke-2" />
      </div>
    );
  }
  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/80 text-primary"
      aria-hidden
    >
      <Info className="size-4 stroke-2" />
    </div>
  );
};

const toastDescriptionTone: Record<AppToast["variant"], string> = {
  info: "text-muted-foreground",
  success: "text-white/85",
  error: "text-destructive-foreground/90"
};

const ToastDownloadProgress = ({
  variant,
  progress
}: {
  variant: AppToast["variant"];
  progress: NonNullable<AppToast["downloadProgress"]>;
}) => {
  const track =
    variant === "success"
      ? "bg-white/20"
      : variant === "error"
        ? "bg-destructive-foreground/15"
        : "bg-muted";
  const fill =
    variant === "success"
      ? "bg-white"
      : variant === "error"
        ? "bg-destructive-foreground"
        : "bg-primary";

  const progressLabelRow =
    variant === "success"
      ? "text-white/75"
      : variant === "error"
        ? "text-destructive-foreground/85"
        : "text-muted-foreground";

  const progressMark =
    variant === "success" ? "text-white/90" : variant === "error" ? "text-destructive-foreground" : "text-primary";

  const percentClass =
    variant === "success"
      ? "text-white"
      : variant === "error"
        ? "text-destructive-foreground"
        : "text-foreground/85";

  if (progress.mode === "determinate") {
    return (
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between gap-3">
          <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs font-medium", progressLabelRow)}>
            <Download className={cn("size-3.5 shrink-0", progressMark)} aria-hidden />
            <span className="truncate">Download</span>
          </span>
          <span className={cn("shrink-0 tabular-nums text-xs font-semibold", percentClass)}>{progress.percent}%</span>
        </div>
        <div className={cn("h-[5px] w-full overflow-hidden rounded-full", track)}>
          <div
            className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fill)}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pt-0.5">
      <div className={cn("flex items-center gap-1.5 text-xs font-medium", progressLabelRow)}>
        <Download className={cn("size-3.5 shrink-0 motion-safe:animate-pulse", progressMark)} aria-hidden />
        <span>Preparing download</span>
      </div>
      <div className={cn("h-[5px] w-full overflow-hidden rounded-full", track)}>
        <div className={cn("h-full w-[32%] rounded-full motion-safe:animate-pulse", fill)} />
      </div>
    </div>
  );
};

export const AppToastStack = ({
  toasts,
  onDismiss
}: {
  toasts: AppToast[];
  onDismiss: (id: number) => void;
}) => (
  <>
    {toasts.map((toast) => {
      const primaryAction = toast.primaryAction;
      const descriptionClass = toastDescriptionTone[toast.variant];

      return (
        <Toast
          key={toast.id}
          open
          variant={toast.variant}
          onOpenChange={(open) => {
            if (!open) {
              toast.onDismissed?.(toast.id);
              onDismiss(toast.id);
            }
          }}
        >
          <div className="mt-0.5 shrink-0">
            <ToastVariantIcon variant={toast.variant} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="space-y-1">
              <ToastTitle>{toast.title}</ToastTitle>
              {toast.description ? (
                <ToastDescription className={descriptionClass}>{toast.description}</ToastDescription>
              ) : null}
            </div>
            {toast.downloadProgress ? (
              <ToastDownloadProgress variant={toast.variant} progress={toast.downloadProgress} />
            ) : null}
            {primaryAction ? (
              <div
                className={cn(
                  "flex justify-end border-t pt-2.5",
                  toast.variant === "info" && "border-border/50",
                  toast.variant === "success" && "border-white/15",
                  toast.variant === "error" && "border-destructive-foreground/15"
                )}
              >
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className={cn(
                    "h-8 gap-2 px-3 text-xs font-medium",
                    toast.variant === "success" &&
                      "border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white",
                    toast.variant === "error" &&
                      "border-destructive-foreground/25 bg-destructive-foreground/10 text-destructive-foreground hover:bg-destructive-foreground/15"
                  )}
                  disabled={primaryAction.disabled}
                  onClick={() => {
                    primaryAction.onClick();
                  }}
                >
                  {primaryAction.pending ? (
                    <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="size-3.5 shrink-0 opacity-90" aria-hidden />
                  )}
                  {primaryAction.label}
                </Button>
              </div>
            ) : null}
          </div>
        </Toast>
      );
    })}
  </>
);

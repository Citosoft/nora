import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { AppToast, AppToastDensity, AppToastIcon, AppToastPlacement } from "@/components/app/types/appToast.types";
import { Button } from "@/components/ui/button";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  LoaderCircle,
  RefreshCw,
  X
} from "lucide-react";

const toastIconFrame: Record<AppToastDensity, string> = { comfortable: "size-8", compact: "size-6" };
const toastIconGlyph: Record<AppToastDensity, string> = { comfortable: "size-4", compact: "size-3.5" };

const toastSubjectGlyph: Record<AppToastDensity, string> = { comfortable: "size-5", compact: "size-4" };

const ToastSubjectIcon = ({ icon, density }: { icon: AppToastIcon; density: AppToastDensity }) => (
  <AgentToolIcon
    toolId={icon.toolId}
    label=""
    className={cn("shrink-0 rounded-md bg-muted/80", toastIconFrame[density])}
    imageClassName={toastSubjectGlyph[density]}
  />
);

const ToastVariantIcon = ({ variant, density }: { variant: AppToast["variant"]; density: AppToastDensity }) => {
  if (variant === "success") {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center rounded-md bg-white/18 text-white", toastIconFrame[density])}
        aria-hidden
      >
        <CheckCircle2 className={cn("stroke-2", toastIconGlyph[density])} />
      </div>
    );
  }
  if (variant === "error") {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center rounded-md bg-destructive-foreground/[0.14] text-destructive-foreground", toastIconFrame[density])}
        aria-hidden
      >
        <AlertCircle className={cn("stroke-2", toastIconGlyph[density])} />
      </div>
    );
  }
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-md bg-muted/80 text-primary", toastIconFrame[density])}
      aria-hidden
    >
      <Info className={cn("stroke-2", toastIconGlyph[density])} />
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

const actionToneByVariant: Record<AppToast["variant"], string> = {
  info: "",
  success: "border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white",
  error: "border-destructive-foreground/25 bg-destructive-foreground/10 text-destructive-foreground hover:bg-destructive-foreground/15"
};

const actionDividerByVariant: Record<AppToast["variant"], string> = {
  info: "border-border/50",
  success: "border-white/15",
  error: "border-destructive-foreground/15"
};

const ToastActionButton = ({ toast, density }: { toast: AppToast; density: AppToastDensity }) => {
  const action = toast.primaryAction;
  if (!action) return null;
  const compact = density === "compact";
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className={cn(
        compact ? "h-7 shrink-0 gap-1.5 px-2.5 text-xs font-medium" : "h-8 gap-2 px-3 text-xs font-medium",
        actionToneByVariant[toast.variant]
      )}
      disabled={action.disabled}
      onClick={() => {
        action.onClick();
      }}
    >
      {action.pending ? (
        <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="size-3.5 shrink-0 opacity-90" aria-hidden />
      )}
      {action.label}
    </Button>
  );
};

const ToastDismissButton = ({ label, density, onDismiss }: { label: string; density: AppToastDensity; onDismiss: () => void }) =>
  density === "compact" ? (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
      aria-label={label}
      title={label}
      onClick={onDismiss}
    >
      <X className="size-3.5" aria-hidden />
    </Button>
  ) : (
    <Button type="button" size="sm" variant="ghost" className="h-8 px-3 text-xs font-medium" onClick={onDismiss}>
      {label}
    </Button>
  );

const AppToastItem = ({ toast, onDismiss }: { toast: AppToast; onDismiss: (id: number) => void }) => {
  const density = toast.density ?? "comfortable";
  const compact = density === "compact";
  const descriptionClass = toastDescriptionTone[toast.variant];
  const dismiss = (): void => {
    toast.onDismissed?.(toast.id);
    onDismiss(toast.id);
  };
  const dismissButton = toast.dismissLabel ? (
    <ToastDismissButton label={toast.dismissLabel} density={density} onDismiss={dismiss} />
  ) : null;

  return (
    <Toast
      open
      duration={toast.durationMs}
      variant={toast.variant}
      density={density}
      onOpenChange={(open) => {
        if (!open) {
          dismiss();
        }
      }}
    >
      <div className={cn("shrink-0", !compact && "mt-0.5")}>
        {toast.icon ? (
          <ToastSubjectIcon icon={toast.icon} density={density} />
        ) : (
          <ToastVariantIcon variant={toast.variant} density={density} />
        )}
      </div>
      <div className={cn("flex min-w-0 flex-1", compact ? "items-center gap-2.5" : "flex-col gap-2")}>
        <div className={cn("min-w-0", compact ? "flex-1 space-y-0.5" : "space-y-1")}>
          <ToastTitle className={cn(compact && "truncate text-[13px]")}>{toast.title}</ToastTitle>
          {toast.description ? (
            <ToastDescription className={cn(descriptionClass, compact && "truncate text-xs leading-snug")}>
              {toast.description}
            </ToastDescription>
          ) : null}
        </div>
        {toast.downloadProgress ? (
          <ToastDownloadProgress variant={toast.variant} progress={toast.downloadProgress} />
        ) : null}
        {compact ? (
          <div className="flex shrink-0 items-center gap-1">
            <ToastActionButton toast={toast} density={density} />
            {dismissButton}
          </div>
        ) : null}
        {!compact && (toast.primaryAction || dismissButton) ? (
          <div className={cn("flex justify-end gap-2 border-t pt-2.5", actionDividerByVariant[toast.variant])}>
            {dismissButton}
            <ToastActionButton toast={toast} density={density} />
          </div>
        ) : null}
      </div>
    </Toast>
  );
};

/** Each corner is its own Radix provider, since a provider portals every toast into its single viewport. */
const toastRegions: ReadonlyArray<{ placement: AppToastPlacement; swipeDirection: "left" | "right"; viewportClassName?: string }> = [
  { placement: "bottom-right", swipeDirection: "right" },
  { placement: "bottom-left", swipeDirection: "left", viewportClassName: "left-4 right-auto w-[min(340px,calc(100vw-2rem))] gap-2" }
];

/** Renders app toasts into their placement's corner region; use instead of a bare `ToastProvider` + viewport. */
export const AppToastRegions = ({
  toasts,
  onDismiss
}: {
  toasts: AppToast[];
  onDismiss: (id: number) => void;
}) => (
  <>
    {toastRegions.map((region) => (
      <ToastProvider key={region.placement} swipeDirection={region.swipeDirection}>
        {toasts
          .filter((toast) => (toast.placement ?? "bottom-right") === region.placement)
          .map((toast) => (
            <AppToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
        <ToastViewport className={region.viewportClassName} />
      </ToastProvider>
    ))}
  </>
);

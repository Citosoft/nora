import type { LinuxUpdateBannerProps } from "@/components/app/types/component.types";
import { Copy, Download, X } from "lucide-react";

export function LinuxUpdateBanner({
  status,
  onCopyCommand,
  onOpenRelease,
  onDismiss
}: LinuxUpdateBannerProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-amber-500/25 bg-amber-500/10 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">
          Linux update available
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Nora {status.latestVersion} is available. You are running {status.currentVersion}. Updates on Linux are managed through APT.
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[4px] border border-border/70 bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent/60"
            onClick={onCopyCommand}
          >
            <Copy className="size-4" />
            <span>Copy upgrade command</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[4px] border border-border/70 bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent/60"
            onClick={onOpenRelease}
          >
            <Download className="size-4" />
            <span>Open release</span>
          </button>
          <code className="rounded-[4px] border border-border/70 bg-background/70 px-2 py-1 text-xs text-foreground">
            {status.updateCommand}
          </code>
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-[4px] p-1.5 text-muted-foreground transition hover:bg-background/70 hover:text-foreground"
        onClick={onDismiss}
        aria-label="Dismiss Linux update notice"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

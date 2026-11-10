import { LoaderCircle } from "lucide-react";
import type { ActivityNoticeProps } from "@/components/app/types/workspaceUtilities.types";

export function ActivityNotice({ entries }: ActivityNoticeProps) {
  const active = entries[entries.length - 1];
  if (!active) return null;
  return <div role="status" aria-live="polite" className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
    {active.loading && <LoaderCircle className="size-3.5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />}<span className="truncate">{active.message}</span>
  </div>;
}

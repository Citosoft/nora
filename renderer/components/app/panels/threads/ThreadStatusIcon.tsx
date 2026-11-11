import { CircleCheck, CircleAlert, CircleHelp, CircleStop, LoaderCircle, PauseCircle, ShieldQuestion, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ThreadNavigationStatus, ThreadStatusIconProps } from "@/components/app/types/thread-workspace/ports.types";

const statusIcons: Partial<Record<ThreadNavigationStatus, LucideIcon>> = {
  Settled: CircleCheck,
  "Needs input": CircleHelp,
  "Needs approval": ShieldQuestion,
  Failed: CircleAlert,
  "Outcome unconfirmed": TriangleAlert,
  "Delivery unconfirmed": TriangleAlert,
  "Queue paused": PauseCircle,
  Interrupted: CircleStop
};

export function ThreadStatusIcon({ row }: ThreadStatusIconProps) {
  const StatusIcon = statusIcons[row.status];
  const Icon = StatusIcon ?? (row.working ? LoaderCircle : null);
  const label = StatusIcon ? row.status : "Working";
  const color = row.status === "Failed" ? "text-destructive"
    : row.status === "Settled" ? "text-green-700 dark:text-green-400"
    : ["Needs input", "Needs approval", "Outcome unconfirmed", "Delivery unconfirmed"].includes(row.status)
      ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  if (!Icon && !row.unread) return null;
  return <span className="flex size-3.5 shrink-0 items-center justify-center">
    {Icon ? <Icon role="img" aria-label={label} className={`size-3.5 ${color} ${!StatusIcon && row.working ? "motion-safe:animate-spin" : ""}`} />
      : <span role="img" aria-label="Unread completion" className="size-2 rounded-full bg-primary" />}
  </span>;
}

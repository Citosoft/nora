import { changeStatusLabel, changeStatusTone } from "@/components/app/logic/changeStatus";
import type { ChangeStatusBadgeProps } from "@/components/app/types/diffLine.types";
import { cn } from "@/lib/utils";

export function ChangeStatusBadge({ status }: ChangeStatusBadgeProps) {
  return <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", changeStatusTone(status))}>{changeStatusLabel(status)}</span>;
}

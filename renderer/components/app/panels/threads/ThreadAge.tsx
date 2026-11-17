import { formatThreadAge } from "@/components/app/logic/thread-workspace/threadAge";
import type { ThreadAgeProps } from "@/components/app/types/thread-workspace/list.types";

import { cn } from "@/lib/utils";

export function ThreadAge({ updatedAt, now, className }: ThreadAgeProps) {
  const age = formatThreadAge(updatedAt, now);
  if (!age) return null;
  return <time dateTime={updatedAt} title={`${age.description} · ${new Date(updatedAt).toLocaleString()}`} aria-label={age.description}
    className={cn("shrink-0 text-[10px] tabular-nums text-muted-foreground", className)}>{age.label}</time>;
}

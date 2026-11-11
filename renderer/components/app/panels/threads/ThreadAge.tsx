import { formatThreadAge } from "@/components/app/logic/thread-workspace/threadAge";
import type { ThreadAgeProps } from "@/components/app/types/thread-workspace/list.types";

export function ThreadAge({ updatedAt, now }: ThreadAgeProps) {
  const age = formatThreadAge(updatedAt, now);
  if (!age) return null;
  return <time dateTime={updatedAt} title={`${age.description} · ${new Date(updatedAt).toLocaleString()}`} aria-label={age.description}
    className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{age.label}</time>;
}

import { Button } from "@/components/ui/button";
import type { ThreadGroupShowMoreProps } from "@/components/app/types/thread-workspace/navigation.types";

/** Reveals the remaining threads in place, under the group they belong to. */
export function ThreadGroupShowMore({ hidden, expanded, label, onToggle }: ThreadGroupShowMoreProps) {
  const text = expanded ? "Show less" : `Show more (${hidden})`;
  return <Button type="button" variant="ghost" size="sm" className="h-7 w-full justify-start px-2 text-xs text-muted-foreground" aria-expanded={expanded}
    aria-label={label ? `${text} in ${label}` : undefined} onClick={onToggle}>{text}</Button>;
}

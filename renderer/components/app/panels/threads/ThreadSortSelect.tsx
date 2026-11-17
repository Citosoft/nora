import { threadSortOptions, threadSortSchema } from "@/components/app/logic/thread-workspace/sorting";
import { threadSortIcons } from "@/components/app/constants/threadViewIcons";
import { Select } from "@/components/ui/select";
import { ThreadViewOptionLabel } from "./ThreadViewOptionLabel";
import type { ThreadSortSelectProps } from "@/components/app/types/thread-workspace/toolbar.types";

export function ThreadSortSelect({ sort, onSortChange }: ThreadSortSelectProps) {
  return <Select value={sort} aria-label="Sort threads by" className="h-8 px-2 text-xs" onChange={(event) => {
    const parsed = threadSortSchema.safeParse(event.target.value);
    if (parsed.success) onSortChange(parsed.data);
  }}>{threadSortOptions.map((entry) => {
    const Icon = threadSortIcons[entry.id];
    return <option key={entry.id} value={entry.id}><ThreadViewOptionLabel label={entry.label} icon={<Icon className="size-3.5 text-muted-foreground" />} /></option>;
  })}</Select>;
}

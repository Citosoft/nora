import { useMemo } from "react";
import { ThreadGroupShowMore } from "./ThreadGroupShowMore";
import { previewThreadGroup } from "@/components/app/logic/thread-workspace/groupPreview";
import type { ThreadGroupRowsProps } from "@/components/app/types/thread-workspace/navigation.types";

export function ThreadGroupRows({ group, expanded, onToggle, renderRow }: ThreadGroupRowsProps) {
  const preview = useMemo(() => previewThreadGroup(group.rows, expanded), [group.rows, expanded]);
  return <>
    {preview.rows.map(renderRow)}
    {preview.limited && <ThreadGroupShowMore hidden={preview.hidden} expanded={expanded} label={group.label} onToggle={onToggle} />}
  </>;
}

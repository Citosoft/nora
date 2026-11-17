import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpAZ, ArrowUpWideNarrow, Activity, Boxes, CircleCheck, Clock3, FolderGit2, List, PanelsTopLeft, TriangleAlert } from "lucide-react";
import type { ThreadSort } from "@/components/app/types/thread-workspace/list.types";
import type { LucideIcon } from "lucide-react";
import type { ThreadNavigationFilter } from "@/components/app/types/thread-workspace/ports.types";
import type { ThreadGrouping } from "@/components/app/types/thread-workspace/navigation.types";

export const threadFilterIcons: Readonly<Record<ThreadNavigationFilter, LucideIcon>> = {
  all: Clock3,
  active: Activity,
  attention: TriangleAlert,
  settled: CircleCheck
};
export const threadGroupingIcons: Readonly<Record<ThreadGrouping, LucideIcon>> = {
  none: List,
  workspace: FolderGit2,
  activity: Activity,
  source: PanelsTopLeft,
  provider: Boxes
};

export const threadSortIcons: Readonly<Record<ThreadSort, LucideIcon>> = {
  recent: ArrowDownWideNarrow,
  oldest: ArrowUpWideNarrow,
  "title-asc": ArrowDownAZ,
  "title-desc": ArrowUpAZ
};

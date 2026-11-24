import type { ReactNode } from "react";
import type { ThreadSourceFilter, ThreadSort } from "./list.types";
import type { ThreadGrouping } from "./navigation.types";
import type { ThreadNavigationFilter } from "./ports.types";

export interface ThreadFilterOption {
  id: ThreadNavigationFilter;
  label: string;
}

export interface ThreadViewOptionsProps {
  canGroupByWorkspace: boolean;
  filter: ThreadNavigationFilter;
  sort: ThreadSort;
  onSortChange(sort: ThreadSort): void;
  sourceFilter: ThreadSourceFilter;
  onSourceFilterChange(source: ThreadSourceFilter): void;
  grouping: ThreadGrouping;
  onFilterChange(filter: ThreadNavigationFilter): void;
  onGroupingChange(grouping: ThreadGrouping): void;
}

/** The header's refresh button: reloads Nora's threads and, when shown, rescans other tools for resumable ones. */
export interface ThreadRefreshControl {
  loading: boolean;
  disabled: boolean;
  onRefresh(): void;
}

export interface ThreadToolbarProps extends ThreadViewOptionsProps {
  refresh: ThreadRefreshControl;
  onBulkSettle?(): void;
  bulkSettleDisabled?: boolean;
  allWorkspaces?: boolean;
  onScopeChange(allWorkspaces: boolean): void;
  onNew?(): void;
  newDisabled?: boolean;
}

export interface ThreadViewOptionLabelProps { icon: ReactNode; label: string; }

export type ThreadSortSelectProps = Pick<ThreadViewOptionsProps, "sort" | "onSortChange">;

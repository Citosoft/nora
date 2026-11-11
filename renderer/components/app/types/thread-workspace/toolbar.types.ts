import type { ThreadGrouping } from "./navigation.types";
import type { ThreadNavigationFilter } from "./ports.types";

export interface ThreadFilterOption {
  id: ThreadNavigationFilter;
  label: string;
}

export interface ThreadViewOptionsProps {
  filter: ThreadNavigationFilter;
  grouping: ThreadGrouping;
  onFilterChange(filter: ThreadNavigationFilter): void;
  onGroupingChange(grouping: ThreadGrouping): void;
}

export interface ThreadToolbarProps extends ThreadViewOptionsProps {
  allWorkspaces?: boolean;
  onScopeChange(allWorkspaces: boolean): void;
  onNew?(): void;
  newDisabled?: boolean;
}

import type { ComponentType, ReactNode } from "react";
import type { ChangeEntry, CommitHistoryEntry } from "@shared/appTypes";

export interface SidebarTabItem<T extends string> {
  id: T;
  label: string;
  Icon?: ComponentType<{ className?: string }>;
  title?: string;
  /** Small status mark beside the tab, such as the branch's pull request state. */
  indicator?: ReactNode;
}

export interface SidebarTabBarProps<T extends string> {
  items: readonly SidebarTabItem<T>[];
  active: T;
  ariaLabel: string;
  iconOnlyInactive?: boolean;
  onChange(id: T): void;
}

export interface SidebarSectionHeaderProps {
  title: string;
  count?: number;
  actions?: ReactNode;
  /** Present when the section can collapse; the header then toggles it. */
  collapse?: { collapsed: boolean; onToggle(): void };
}

export interface CommitHistoryRowProps {
  entry: CommitHistoryEntry;
  timestamp: string;
  selected: boolean;
  onInspect(hash: string): void;
}

export interface ChangedFileRowProps {
  change: ChangeEntry;
  selected: boolean;
  annotationCount: number;
  /** Absent while inspecting a commit, where files cannot be staged, discarded or edited. */
  workingTree: {
    included: boolean;
    discarding: boolean;
    onToggleIncluded(): void;
    onDiscard(): void;
    onEdit(): void;
  } | null;
  onSelect(): void;
}

export interface CommitComposerProps {
  message: string;
  committing: boolean;
  canCommit: boolean;
  selectionLabel: string;
  ai: { generating: boolean; disabled: boolean; onGenerate(): void } | null;
  /** Remote and pull request actions shown beside Commit. */
  actions: ReactNode;
  notice?: ReactNode;
  onMessageChange(message: string): void;
  onCommit(): void;
}

export interface SidebarIconActionProps {
  label: string;
  icon: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  count?: number;
  /** Set for toggles, such as choosing a forge provider. */
  pressed?: boolean;
  onClick(): void;
}

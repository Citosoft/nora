import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";

export interface WorkspaceSessionTabIconProps {
  tab: WorkspaceSessionTab;
}

export interface WorkspaceSessionTabOverflowProps {
  tabs: WorkspaceSessionTab[];
  activeTabId: string | null;
  onSelect: (tab: WorkspaceSessionTab) => void;
}

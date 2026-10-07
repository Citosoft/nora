import type {
  AllThreadsGroupBy,
  AllThreadsVisibleGroupSection,
  AllWorkspaceThreadListEntry
} from "@/components/app/types/workspaceSidebarAllThreads.types";
import type { CreateAgentPayload, ExternalHarnessContextRef } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type WorkspaceSidebarAllThreadsSectionProps = {
  allThreadsWorkspaceFilter: string;
  setAllThreadsWorkspaceFilter: Dispatch<SetStateAction<string>>;
  allThreadsWorkspaceFilterOptions: Array<{ value: string; label: string }>;
  allThreadsHarnessFilter: string;
  setAllThreadsHarnessFilter: Dispatch<SetStateAction<string>>;
  allThreadsHarnessFilterOptions: Array<{ value: string; label: string }>;
  allThreadsGroupBy: AllThreadsGroupBy;
  setAllThreadsGroupBy: Dispatch<SetStateAction<AllThreadsGroupBy>>;
  isAllThreadsSectionCollapsed: boolean;
  setIsAllThreadsSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  filteredAllWorkspaceThreadEntries: AllWorkspaceThreadListEntry[];
  allThreadsGroupSections: AllThreadsVisibleGroupSection[];
  onToggleGroupExpanded: (groupKey: string) => void;
  isLoadingAllThreads: boolean;
  onResumeThread: (projectId: string, payload: CreateAgentPayload) => Promise<void>;
  onArchiveThread: (projectId: string, ref: ExternalHarnessContextRef) => Promise<void>;
  onThreadsChanged: () => void;
};

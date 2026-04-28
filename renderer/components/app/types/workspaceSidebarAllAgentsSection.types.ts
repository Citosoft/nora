import type {
  AllAgentsGroupBy,
  AllAgentsGroupSection,
  AllAgentsPrFilter,
  AllWorkspaceAgentListEntry
} from "@/components/app/types/workspaceSidebarAllAgents.types";
import type { AgentSession } from "@shared/appTypes";
import type { Dispatch, MouseEvent, SetStateAction } from "react";

export type WorkspaceSidebarAllAgentsSectionProps = {
  focusedAgent: AgentSession | null;
  now: number;
  allAgentsWorkspaceFilter: string;
  setAllAgentsWorkspaceFilter: Dispatch<SetStateAction<string>>;
  allAgentsWorkspaceFilterOptions: Array<{ value: string; label: string }>;
  allAgentsPrFilter: AllAgentsPrFilter;
  setAllAgentsPrFilter: Dispatch<SetStateAction<AllAgentsPrFilter>>;
  allAgentsGroupBy: AllAgentsGroupBy;
  setAllAgentsGroupBy: Dispatch<SetStateAction<AllAgentsGroupBy>>;
  isAllAgentsSectionCollapsed: boolean;
  setIsAllAgentsSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  filteredAllWorkspaceAgentEntries: AllWorkspaceAgentListEntry[];
  allAgentsGroupSections: AllAgentsGroupSection[];
  openAgentSessionMenu: (
    workspaceId: string,
    agent: AgentSession,
    pullRequestWebUrl: string | null,
    event: MouseEvent<Element>
  ) => void;
  onFocusAgent: (agentId: string) => void;
  onFocusWorkspaceAgent: (workspaceId: string, agentId: string) => void;
};

import type { StatusBarEntry } from "@/components/app/types";
import type { TitleBarProps } from "@/components/app/types/chromeDialog.types";
import type { AgentCatalogEntry, AgentSkillCatalog, ToolUsageInfo, ToolUsageWindow } from "@shared/appTypes";
import type { LucideIcon } from "lucide-react";

export type AppToolsProps = Pick<TitleBarProps,
  "resolvedTheme" | "onToggleTheme" | "onOpenSettings" | "onOpenKeyboardShortcuts" | "onOpenAbout" |
  "onSubmitIssue" | "onOpenStartupDependencies" | "onOpenResourceMonitor" | "onOpenOnboarding"
> & { collapsed?: boolean; settingsActive?: boolean; };

export interface WorkspaceStatusInput {
  entries: StatusBarEntry[];
  tools: AgentCatalogEntry[];
  agentSkillCatalogs: AgentSkillCatalog[];
  activeWorkspaceBranch?: string | null;
  activeWorkspaceWorktreeName?: string | null;
  onInstallTool(toolId: string): Promise<void> | void;
  onSwitchToolAccount(toolId: string): Promise<void> | void;
  onOpenSkillsSettings(): void;
}

export interface WorkspaceUtilitiesInput {
  status: WorkspaceStatusInput;
  appTools: AppToolsProps;
  terminal: { isOpen: boolean; onToggle(): void; };
}

export interface WorkspaceUtilitiesProps { collapsed: boolean; }
export type WorkspaceUtilitiesViewProps = WorkspaceUtilitiesProps & WorkspaceUtilitiesInput;
export type ModelUsageProps = Pick<WorkspaceStatusInput, "tools" | "onInstallTool" | "onSwitchToolAccount"> & WorkspaceUtilitiesProps;
export interface UtilityPanelProps { onClose(): void; }
export type SkillsPanelProps = Pick<WorkspaceStatusInput, "tools" | "agentSkillCatalogs" | "onOpenSkillsSettings"> & UtilityPanelProps;
export type WorkspaceStatusProps = Pick<WorkspaceStatusInput, "entries" | "activeWorkspaceBranch" | "activeWorkspaceWorktreeName">;
export type WorkspaceToolSection = "status" | "skills" | "chatbots" | "mounts" | "ports";
export type WorkspaceToolsProps = WorkspaceUtilitiesProps & { status: WorkspaceStatusInput; };
export interface WorkspaceToolItem { id: WorkspaceToolSection; label: string; icon: LucideIcon; }
export interface WorkspaceToolContentProps { section: WorkspaceToolSection; status: WorkspaceStatusInput; onClose(): void; }
export interface UsageDetailsProps {
  tool: AgentCatalogEntry;
  usageInfo: ToolUsageInfo | null;
  isUsageLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
  onInstall(): void;
  onSwitchAccount(refreshUsage: boolean): void;
  onRefresh(): void;
}
export interface UsageWindowRowProps { window: ToolUsageWindow; }
export interface ActivityNoticeProps { entries: StatusBarEntry[]; }

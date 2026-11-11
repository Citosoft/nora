import type { StatusBarEntry } from "@/components/app/types";
import type { TitleBarProps } from "@/components/app/types/chromeDialog.types";
import type { AgentCatalogEntry, ToolUsageInfo, ToolUsageWindow } from "@shared/appTypes";

export type AppToolsProps = Pick<TitleBarProps,
  "resolvedTheme" | "onToggleTheme" | "onOpenSettings" | "onOpenKeyboardShortcuts" | "onOpenAbout" |
  "onSubmitIssue" | "onOpenStartupDependencies" | "onOpenResourceMonitor" | "onOpenOnboarding"
> & { collapsed?: boolean; settingsActive?: boolean; onOpenHomeTerminal?(): void; onOpenConnectionsSettings?(): void; };

export interface WorkspaceStatusInput {
  entries: StatusBarEntry[];
  tools: AgentCatalogEntry[];
  activeWorkspaceBranch?: string | null;
  activeWorkspaceWorktreeName?: string | null;
  onInstallTool(toolId: string): Promise<void> | void;
  onSwitchToolAccount(toolId: string): Promise<void> | void;
}

export interface WorkspaceUtilitiesInput {
  status: WorkspaceStatusInput;
  appTools: AppToolsProps;
}

export interface WorkspaceUtilitiesProps { collapsed: boolean; }
export type WorkspaceUtilitiesViewProps = WorkspaceUtilitiesProps & WorkspaceUtilitiesInput;
export type ModelUsageProps = Pick<WorkspaceStatusInput, "tools" | "onInstallTool" | "onSwitchToolAccount"> & WorkspaceUtilitiesProps;
export interface UtilityPanelProps { onClose(): void; }
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

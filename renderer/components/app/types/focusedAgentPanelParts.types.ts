import type { ResolvedTheme, TerminalFontId, TerminalThemeId, TerminalSubmission } from "@/components/app/types";
import type { WorkspaceTaskDragPayload } from "@/components/app/types/workspaceTaskDrag.types";
import type { LucideIcon } from "lucide-react";

export type LiveTerminalProps = {
  sessionId: string;
  resetVersion: number;
  submission: TerminalSubmission | null;
  canSendInput: boolean;
  workspaceRootForPathDrop: string | null;
  resolvedTheme: ResolvedTheme;
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
  getTaskDropText: (taskReference: WorkspaceTaskDragPayload) => string;
};

export type AgentInfoRowProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export type FocusedAgentInjectableContext = {
  agentId: string;
  agentName: string;
  toolLabel: string;
  contextFilePath: string;
  preview: string;
};

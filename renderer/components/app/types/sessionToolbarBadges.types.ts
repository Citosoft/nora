import type { AgentSession, TerminalSession } from "@shared/appTypes";

export type SessionFolderBadgeProps = {
  workspace: string;
  className?: string;
};

export type SessionBranchSelectProps = {
  session: Pick<AgentSession | TerminalSession, "projectId" | "workspace" | "branch">;
};

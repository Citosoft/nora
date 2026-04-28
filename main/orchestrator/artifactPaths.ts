import { getAgentContextPath, getWorktreeContextPath, getWorktreeTerminalPath } from "../noraPaths";

export const getWorktreeArtifactPaths = (
  projectId: string,
  sessionId: string,
  worktreeId: string,
  agentId?: string
): {
  contextFilePath: string;
  terminalStreamPath: string;
} => ({
  contextFilePath: agentId
    ? getAgentContextPath(projectId, sessionId, worktreeId, agentId)
    : getWorktreeContextPath(projectId, sessionId, worktreeId),
  terminalStreamPath: getWorktreeTerminalPath(projectId, sessionId, worktreeId)
});

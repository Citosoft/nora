import type { LocalTerminalState } from "@shared/appTypes";
import type { SessionBridge } from "@shared/ipc/types/sessionGateway.types";

import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createSessionBridge(): SessionBridge {
  return {
    createAgent: (payload) => invokeIpc("app:create-agent", payload),
    focusAgent: (agentId) => invokeIpc("app:focus-agent", agentId),
    restartAgent: (agentId) => invokeIpc("app:restart-agent", agentId),
    destroyAgent: (agentId) => invokeIpc("app:destroy-agent", agentId),
    sendAgentInput: (agentId, input) => invokeIpc("app:send-agent-input", agentId, input),
    sendAgentPrompt: (agentId, input) => invokeIpc("app:send-agent-prompt", agentId, input),
    sendAgentTerminalInput: (agentId, input) => invokeIpc("app:send-agent-terminal-input", agentId, input),
    getAgentTerminalBuffer: (agentId) => invokeIpc("app:get-agent-terminal-buffer", agentId),
    getAgentContextPreview: (agentId) => invokeIpc("app:get-agent-context-preview", agentId),
    getAgentContextState: (agentId) => invokeIpc("app:get-agent-context-state", agentId),
    listWorkspaceAgentContextSources: (projectId, excludeAgentId) =>
      invokeIpc("app:list-workspace-agent-context-sources", projectId, excludeAgentId),
    clearAgentContext: (agentId) => invokeIpc("app:clear-agent-context", agentId),
    clearAgentTerminal: (agentId) => invokeIpc("app:clear-agent-terminal", agentId),
    resizeAgentTerminal: (agentId, cols, rows) => invokeIpc("app:resize-agent-terminal", agentId, cols, rows),
    createTerminal: (payload) => invokeIpc("app:create-terminal", payload),
    focusTerminal: (sessionId) => invokeIpc("app:focus-terminal", sessionId),
    restartTerminal: (sessionId) => invokeIpc("app:restart-terminal", sessionId),
    clearTerminal: (sessionId) => invokeIpc("app:clear-terminal", sessionId),
    destroyTerminal: (sessionId) => invokeIpc("app:destroy-terminal", sessionId),
    sendTerminalInput: (sessionId, input) => invokeIpc("app:send-terminal-input", sessionId, input),
    getTerminalBuffer: (sessionId) => invokeIpc("app:get-terminal-buffer", sessionId),
    resizeTerminal: (sessionId, cols, rows) => invokeIpc("app:resize-terminal", sessionId, cols, rows),
    openLocalTerminal: (shellId) => invokeIpc("app:open-local-terminal", shellId),
    getLocalTerminalState: () => invokeIpc("app:get-local-terminal-state"),
    onLocalTerminalStateChanged: (listener) =>
      subscribeToIpcEvent<LocalTerminalState | null>("local-terminal:changed", listener),
    restartLocalTerminal: () => invokeIpc("app:restart-local-terminal"),
    clearLocalTerminal: () => invokeIpc("app:clear-local-terminal"),
    destroyLocalTerminal: () => invokeIpc("app:destroy-local-terminal"),
    focusWorktree: (worktreeId) => invokeIpc("app:focus-worktree", worktreeId),
    onTerminalData: (listener) =>
      subscribeToIpcEvent<{ sessionId: string; data: string }>("terminal:data", listener),
    sendWindowEnter: () => invokeIpc("window:send-enter")
  };
}

import type { SessionService } from "../types/mainServices.types";

type SessionServiceDeps = SessionService;

export function createSessionService(deps: SessionServiceDeps): SessionService {
  return {
    createAgent: deps.createAgent,
    createTerminal: deps.createTerminal,
    openLocalTerminal: deps.openLocalTerminal,
    clearAgentContext: deps.clearAgentContext,
    clearAgentTerminal: deps.clearAgentTerminal,
    clearTerminal: deps.clearTerminal,
    clearLocalTerminal: deps.clearLocalTerminal,
    sendAgentInput: deps.sendAgentInput,
    sendAgentPrompt: deps.sendAgentPrompt,
    sendAgentTerminalInput: deps.sendAgentTerminalInput,
    sendTerminalInput: deps.sendTerminalInput,
    resizeAgentTerminal: deps.resizeAgentTerminal,
    resizeTerminal: deps.resizeTerminal,
    focusWorktree: deps.focusWorktree,
    focusAgent: deps.focusAgent,
    focusTerminal: deps.focusTerminal,
    restartAgent: deps.restartAgent,
    restartTerminal: deps.restartTerminal,
    restartLocalTerminal: deps.restartLocalTerminal,
    destroyAgent: deps.destroyAgent,
    destroyTerminal: deps.destroyTerminal,
    destroyLocalTerminal: deps.destroyLocalTerminal,
    stopAllAgentsGracefully: deps.stopAllAgentsGracefully
  };
}

import type { AppState, CreateAgentPayload, CreateTerminalPayload } from "@shared/appTypes";
import { ipcMain } from "electron";
import type { MainServices } from "@main/services/mainServices";
import { normalizeCreateAgentPayload, validateCreateAgentPayload } from "@main/helpers/ipcValidation";

interface RegisterSessionIpcDeps {
  services: MainServices;
  withSnapshot: (action: () => Promise<AppState>) => Promise<AppState>;
}

export function registerSessionIpc({ services, withSnapshot }: RegisterSessionIpcDeps): void {
  ipcMain.handle("app:clear-agent-context", (_event, agentId: string) =>
    services.session.clearAgentContext(agentId)
  );
  ipcMain.handle("app:clear-agent-terminal", (_event, agentId: string) =>
    withSnapshot(() => services.session.clearAgentTerminal(agentId))
  );
  ipcMain.handle("app:clear-terminal", (_event, sessionId: string) =>
    withSnapshot(() => services.session.clearTerminal(sessionId))
  );
  ipcMain.handle("app:clear-local-terminal", () =>
    services.session.clearLocalTerminal()
  );
  ipcMain.handle("app:create-agent", (_event, payload: CreateAgentPayload) =>
    withSnapshot(() => {
      const normalized = normalizeCreateAgentPayload(payload);
      validateCreateAgentPayload(normalized);
      return services.session.createAgent(normalized);
    })
  );
  ipcMain.handle("app:create-terminal", (_event, payload: CreateTerminalPayload) =>
    withSnapshot(() => services.session.createTerminal(payload))
  );
  ipcMain.handle("app:rename-terminal", (_event, sessionId: string, name: string) =>
    withSnapshot(() => services.session.renameTerminal(sessionId, name))
  );
  ipcMain.handle("app:open-local-terminal", (_event, shellId?: string) =>
    services.session.openLocalTerminal(shellId)
  );
  ipcMain.handle("app:send-agent-input", (_event, agentId: string, input: string) =>
    withSnapshot(() => services.session.sendAgentInput(agentId, input))
  );
  ipcMain.handle("app:send-agent-prompt", (_event, agentId: string, input) =>
    services.session.sendAgentPrompt(agentId, input)
  );
  ipcMain.handle("app:send-agent-terminal-input", (_event, agentId: string, input: string) =>
    services.session.sendAgentTerminalInput(agentId, input)
  );
  ipcMain.handle("app:send-terminal-input", (_event, sessionId: string, input: string) =>
    services.session.sendTerminalInput(sessionId, input)
  );
  ipcMain.handle("app:resize-agent-terminal", (_event, agentId: string, cols: number, rows: number) => {
    services.session.resizeAgentTerminal(agentId, cols, rows);
  });
  ipcMain.handle("app:resize-terminal", (_event, sessionId: string, cols: number, rows: number) => {
    services.session.resizeTerminal(sessionId, cols, rows);
  });
  ipcMain.handle("app:focus-worktree", (_event, worktreeId: string) =>
    withSnapshot(() => services.session.focusWorktree(worktreeId))
  );
  ipcMain.handle("app:focus-agent", (_event, agentId: string) =>
    withSnapshot(() => services.session.focusAgent(agentId))
  );
  ipcMain.handle("app:focus-terminal", (_event, sessionId: string) =>
    withSnapshot(() => services.session.focusTerminal(sessionId))
  );
  ipcMain.handle("app:restart-agent", (_event, agentId: string) =>
    withSnapshot(() => services.session.restartAgent(agentId))
  );
  ipcMain.handle("app:restart-terminal", (_event, sessionId: string) =>
    withSnapshot(() => services.session.restartTerminal(sessionId))
  );
  ipcMain.handle("app:restart-local-terminal", () =>
    services.session.restartLocalTerminal()
  );
  ipcMain.handle("app:destroy-agent", (_event, agentId: string) =>
    withSnapshot(() => services.session.destroyAgent(agentId))
  );
  ipcMain.handle("app:destroy-terminal", (_event, sessionId: string) =>
    withSnapshot(() => services.session.destroyTerminal(sessionId))
  );
  ipcMain.handle("app:remove-worktree", (_event, worktreeId: string) =>
    withSnapshot(() => services.session.removeWorktree(worktreeId))
  );
  ipcMain.handle("app:destroy-local-terminal", () =>
    services.session.destroyLocalTerminal()
  );
}

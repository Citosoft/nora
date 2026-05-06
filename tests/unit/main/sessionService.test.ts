import { createSessionService } from "@main/services/sessionService";
import type { SessionService } from "@main/types/mainServices.types";
import assert from "node:assert/strict";
import test from "node:test";

function createSessionServiceStub(): SessionService {
  return {
    createAgent: async () => {
      throw new Error("not used");
    },
    createTerminal: async () => {
      throw new Error("not used");
    },
    openLocalTerminal: async () => {
      throw new Error("not used");
    },
    clearAgentContext: async () => {
      throw new Error("not used");
    },
    clearAgentTerminal: async () => {
      throw new Error("not used");
    },
    clearTerminal: async () => {
      throw new Error("not used");
    },
    clearLocalTerminal: async () => null,
    sendAgentInput: async () => {
      throw new Error("not used");
    },
    sendAgentPrompt: async () => {
      throw new Error("not used");
    },
    sendAgentTerminalInput: async () => undefined,
    sendTerminalInput: async () => undefined,
    resizeAgentTerminal: () => {
      throw new Error("not used");
    },
    resizeTerminal: () => {
      throw new Error("not used");
    },
    focusWorktree: async () => {
      throw new Error("not used");
    },
    focusAgent: async () => {
      throw new Error("not used");
    },
    focusTerminal: async () => {
      throw new Error("not used");
    },
    restartAgent: async () => {
      throw new Error("not used");
    },
    restartTerminal: async () => {
      throw new Error("not used");
    },
    restartLocalTerminal: async () => {
      throw new Error("not used");
    },
    destroyAgent: async () => {
      throw new Error("not used");
    },
    destroyTerminal: async () => {
      throw new Error("not used");
    },
    renameTerminal: async () => {
      throw new Error("not used");
    },
    destroyLocalTerminal: async () => null,
    stopAllAgentsGracefully: async () => undefined
  };
}

test("session service terminal input APIs remain write-only", async () => {
  const calls: Array<{ kind: "agent" | "terminal"; id: string; input: string }> = [];
  const deps: SessionService = {
    ...createSessionServiceStub(),
    sendAgentTerminalInput: async (agentId, input) => {
      calls.push({ kind: "agent", id: agentId, input });
    },
    sendTerminalInput: async (sessionId, input) => {
      calls.push({ kind: "terminal", id: sessionId, input });
    }
  };

  const service = createSessionService(deps);
  const agentResult = await service.sendAgentTerminalInput("agent-1", "echo hi");
  const terminalResult = await service.sendTerminalInput("terminal-1", "ls");

  assert.equal(agentResult, undefined);
  assert.equal(terminalResult, undefined);
  assert.deepEqual(calls, [
    { kind: "agent", id: "agent-1", input: "echo hi" },
    { kind: "terminal", id: "terminal-1", input: "ls" }
  ]);
});

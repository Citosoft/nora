import type { AppState } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";
import { StateGateway } from "@main/orchestrator/stateGateway";
import { StateStore } from "@main/stateStore";

function createState(): AppState {
  return {
    focusedAgentId: null,
    focusedTerminalId: null
  } as unknown as AppState;
}

test("StateGateway forwards set and update state operations", () => {
  const store = new StateStore<AppState>(createState());
  const gateway = new StateGateway(store);

  gateway.setState({ focusedAgentId: "agent-1" });
  assert.equal(gateway.getSnapshot().focusedAgentId, "agent-1");

  gateway.updateState((state) => ({
    ...state,
    focusedTerminalId: "terminal-2"
  }));
  assert.equal(gateway.getSnapshot().focusedTerminalId, "terminal-2");
});

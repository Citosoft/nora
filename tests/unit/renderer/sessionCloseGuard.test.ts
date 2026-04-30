import {
  buildDestroyAgentDescription,
  buildDestroyTerminalGuardMessage,
  isBusyTerminalAt
} from "@/components/app/logic/sessionCloseGuard";
import assert from "node:assert/strict";
import test from "node:test";

test("isBusyTerminalAt only flags running terminals that are marked busy", () => {
  const now = Date.parse("2026-04-29T12:00:15.000Z");

  assert.equal(
    isBusyTerminalAt(
      {
        status: "running",
        isBusy: true
      },
      now
    ),
    true
  );
  assert.equal(
    isBusyTerminalAt(
      {
        status: "running",
        isBusy: false
      },
      now
    ),
    false
  );
  assert.equal(
    isBusyTerminalAt(
      {
        status: "stopped",
        isBusy: true
      },
      now
    ),
    false
  );
});

test("buildDestroyTerminalGuardMessage warns when a terminal has recent activity", () => {
  const now = Date.parse("2026-04-29T12:00:15.000Z");

  assert.equal(
    buildDestroyTerminalGuardMessage(
      {
        name: "Dev Server",
        status: "running",
        isBusy: true
      },
      now
    ),
    'Terminal "Dev Server" is still busy. Close it and stop the running process?'
  );
  assert.equal(
    buildDestroyTerminalGuardMessage(
      {
        name: "Idle Shell",
        status: "running",
        isBusy: false
      },
      now
    ),
    null
  );
});

test("buildDestroyAgentDescription escalates wording for agents that are still working", () => {
  const now = Date.parse("2026-04-29T12:00:15.000Z");

  assert.equal(
    buildDestroyAgentDescription(
      {
        status: "running",
        isBusy: true,
        busyUntil: "2026-04-29T12:00:20.000Z"
      },
      now
    ),
    "This agent is still working. Destroying it now will stop the current task. If no other agents are attached, Nora will also remove the worktree."
  );
  assert.equal(
    buildDestroyAgentDescription(
      {
        status: "running",
        isBusy: false,
        busyUntil: null
      },
      now
    ),
    "This will stop the agent. If no other agents are attached, Nora will also remove the worktree."
  );
});

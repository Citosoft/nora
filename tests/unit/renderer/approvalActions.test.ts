import assert from "node:assert/strict";
import test from "node:test";
import { groupApprovalActions } from "@/components/app/logic/approvalActions";

test("the primary approval prefers one action over broader permissions", () => {
  const groups = groupApprovalActions([
    { id: "always", label: "Always allow", intent: "allow", scope: "persistent" },
    { id: "session", label: "Allow for session", intent: "allow", scope: "session" },
    { id: "deny", label: "Decline", intent: "deny" },
    { id: "once", label: "Allow once", intent: "allow", scope: "once" },
    { id: "cancel", label: "Stop task", intent: "cancel" }
  ]);
  assert.equal(groups.primary?.option.id, "once");
  assert.deepEqual(groups.secondary.map(({ option }) => option.id), ["always", "session"]);
  assert.deepEqual(groups.negative.map(({ option }) => option.id), ["deny", "cancel"]);
});

test("native options without intent still prefer a single approval over session approval", () => {
  const groups = groupApprovalActions([
    { id: "acceptForSession", label: "Allow for session" }, { id: "accept", label: "Allow once" }, { id: "decline", label: "Decline" }
  ]);
  assert.equal(groups.primary?.option.id, "accept");
  assert.equal(groups.secondary[0].option.id, "acceptForSession");
  assert.equal(groups.negative[0].intent, "deny");
});

test("when only broader approvals are available, session permission takes precedence over persistent permission", () => {
  const groups = groupApprovalActions([
    { id: "always", label: "Always allow", intent: "allow", scope: "persistent" },
    { id: "session", label: "Allow for session", intent: "allow", scope: "session" }
  ]);
  assert.equal(groups.primary?.option.id, "session");
});

test("explicit intent wins over an option id and unfamiliar actions are retained", () => {
  const options = [{ id: "allow", label: "Do not allow", intent: "deny" as const }, { id: "custom", label: "Review in provider", description: "Open the provider's review." }];
  const groups = groupApprovalActions(options);
  assert.equal(groups.primary, null);
  assert.equal(groups.negative[0].option, options[0]);
  assert.equal(groups.secondary[0].option, options[1]);
});

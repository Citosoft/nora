import assert from "node:assert/strict";
import test from "node:test";
import { missingRuntimeProviders } from "@/components/app/logic/missingRuntimeProviders";

test("missing runtimes are installed agents Nora can run but has not registered", () => {
  const providers = [{ kind: "claude" as const, instanceId: "local", label: "Claude", reportsMcp: true }];
  assert.deepEqual(missingRuntimeProviders(["claude", "grok", "not-a-provider", "cursor"], providers), ["cursor", "grok"]);
  assert.deepEqual(missingRuntimeProviders(["claude"], providers), []);
});

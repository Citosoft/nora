import assert from "node:assert/strict";
import test from "node:test";
import { enabledAccountProviders } from "@/components/app/logic/enabledAccountProviders";

test("only enabled agents with a registered runtime have their sign-in read", () => {
  const providers = [
    { kind: "claude" as const, instanceId: "local", label: "Claude", reportsMcp: true },
    { kind: "codex" as const, instanceId: "local", label: "Codex", reportsMcp: true },
  ];
  assert.deepEqual(enabledAccountProviders(providers, ["codex", "cursor"]).map((provider) => provider.kind), ["codex"]);
  assert.deepEqual(enabledAccountProviders(providers, []), []);
});

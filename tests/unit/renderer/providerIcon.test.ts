import assert from "node:assert/strict";
import test from "node:test";
import { providerIconPresentation } from "@/components/app/logic/providerIcon";

test("Claude subscription, API and unknown connections have distinct icons and accessible labels", () => {
  const subscription = providerIconPresentation("claude", "Claude", "subscription");
  const api = providerIconPresentation("claude", "Claude", "api");
  const unknown = providerIconPresentation("claude", "Claude", "unknown");
  assert.deepEqual([subscription.variant, api.variant, unknown.variant], ["claude-subscription", "claude-api", "claude-unknown"]);
  assert.match(subscription.label, /subscription/);
  assert.match(api.label, /Console \/ API/);
  assert.match(unknown.label, /unavailable/);
  assert.deepEqual(providerIconPresentation("codex", "Codex", "api"), { variant: "provider", label: "Codex" });
});


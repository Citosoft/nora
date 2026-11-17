import { buildProviderUpdateToast, PROVIDER_UPDATE_TOAST_DURATION_MS } from "@/components/app/logic/providerUpdateToast";
import assert from "node:assert/strict";
import test from "node:test";

test("provider update toast names the provider, both versions, and wires the update action", () => {
  let updated = 0;
  const toast = buildProviderUpdateToast(
    { toolId: "codex", label: "Codex", installedVersion: "0.40.0", latestVersion: "0.45.0" },
    () => { updated += 1; }
  );

  assert.equal(toast.title, "Codex update available");
  assert.equal(toast.description, "0.40.0 → 0.45.0");
  assert.equal(toast.placement, "bottom-left");
  assert.equal(toast.density, "compact");
  assert.deepEqual(toast.icon, { kind: "agent-tool", toolId: "codex", label: "Codex" });
  assert.equal(toast.dismissLabel, "Dismiss");
  assert.equal(toast.durationMs, PROVIDER_UPDATE_TOAST_DURATION_MS);
  assert.equal(toast.primaryAction?.label, "Update");
  toast.primaryAction?.onClick();
  assert.equal(updated, 1);
});

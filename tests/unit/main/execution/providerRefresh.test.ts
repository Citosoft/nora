import assert from "node:assert/strict";
import test from "node:test";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { AcpAdapter } from "@main/providers/acp/adapter";

const now = () => "2026-10-21T10:00:00.000Z";
const acp = (kind: "grok" | "kimi") => new AcpAdapter({ kind, instanceId: "local", label: kind, executable: "unused", args: [], now });

test("the registry adopts newly installed providers once and keeps existing instances", async () => {
  const registry = new ProviderRegistry();
  const original = acp("grok");
  registry.register(original);
  assert.equal(registry.adopt(acp("grok")), false);
  assert.equal(registry.resolve("grok", "local"), original, "a rediscovered instance never replaces one conversations already use");
  assert.equal(registry.adopt(acp("kimi")), true);
  assert.equal(registry.resolve("kimi", "local").kind, "kimi");
  await registry.close();
});

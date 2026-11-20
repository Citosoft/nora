import assert from "node:assert/strict";
import test from "node:test";
import { buildVaultSecret, normalizeSecretName, vaultFormFor, vaultScopeLabel, vaultSecretKey } from "@/components/app/logic/secretVault";

const workspaces = [{ id: "w", name: "Web" }];
const saved = { name: "API_TOKEN", purpose: "Deploys", projectId: "w", updatedAt: "2026-11-18T00:00:00.000Z" };

test("a secret's scope is named for the user, including a workspace Nora no longer has", () => {
  assert.equal(vaultScopeLabel(null, workspaces), "Every workspace");
  assert.equal(vaultScopeLabel("w", workspaces), "Web");
  assert.equal(vaultScopeLabel("gone", workspaces), "A workspace no longer in Nora");
  assert.notEqual(vaultSecretKey(saved), vaultSecretKey({ ...saved, projectId: null }));
});

test("typing a name shapes it into an environment variable", () => {
  assert.equal(normalizeSecretName("github token"), "GITHUB_TOKEN");
  assert.equal(normalizeSecretName("stripe-api.key!"), "STRIPE_APIKEY");
});

test("replacing starts from the saved details with a blank value, and adding starts empty for every workspace", () => {
  assert.deepEqual(vaultFormFor({ kind: "replace", secret: saved }), { name: "API_TOKEN", purpose: "Deploys", projectId: "w", value: "" });
  assert.deepEqual(vaultFormFor({ kind: "add" }), { name: "", purpose: "", projectId: "", value: "" });
});

test("a secret needs a valid name and a value, and keeps the value exactly as typed", () => {
  assert.deepEqual(buildVaultSecret({ name: "API_TOKEN", purpose: "  Deploys ", projectId: "", value: " line one\nline two\n" }),
    { ok: true, secret: { name: "API_TOKEN", purpose: "Deploys", projectId: null, value: " line one\nline two\n" } });
  assert.deepEqual(buildVaultSecret({ name: "API_TOKEN", purpose: "", projectId: "w", value: "v" }).ok && "w", "w");
  const badName = buildVaultSecret({ name: "1TOKEN", purpose: "", projectId: "", value: "v" });
  assert.equal(!badName.ok && /environment variable/.test(badName.message), true);
  const noValue = buildVaultSecret({ name: "API_TOKEN", purpose: "", projectId: "", value: "" });
  assert.equal(!noValue.ok && noValue.message, "Enter a value to save");
});

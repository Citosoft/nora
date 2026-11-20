import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { secretsFixture } from "./fixture";

const token = { name: "API_TOKEN", projectId: "w", purpose: "Deploys", value: "s3cr3t-value" };

test("secrets persist with their purpose in the clear and their value encrypted", () => {
  const { store, path, reopen } = secretsFixture();
  store.save(token);
  const file = readFileSync(path, "utf8");
  assert.doesNotMatch(file, /s3cr3t-value/);
  assert.match(file, /Deploys/);
  const reopened = reopen();
  assert.deepEqual(reopened.list("w"), [{ name: "API_TOKEN", purpose: "Deploys", scope: "workspace", updatedAt: "2026-11-18T00:00:00.000Z" }]);
  assert.equal(reopened.values(["API_TOKEN"], "w").get("API_TOKEN"), "s3cr3t-value");
});

test("a workspace secret stays in its workspace and wins over an everywhere secret of the same name", () => {
  const { store } = secretsFixture();
  store.save({ ...token, projectId: null, purpose: "Shared", value: "shared" });
  store.save(token);
  assert.deepEqual(store.list("w").map((secret) => [secret.name, secret.scope]), [["API_TOKEN", "workspace"]]);
  assert.deepEqual(store.list("other").map((secret) => [secret.name, secret.scope]), [["API_TOKEN", "everywhere"]]);
  assert.equal(store.values(["API_TOKEN"], "w").get("API_TOKEN"), "s3cr3t-value");
  assert.equal(store.values(["API_TOKEN"], "other").get("API_TOKEN"), "shared");
  assert.deepEqual(store.all().map((secret) => [secret.name, secret.projectId, secret.purpose]), [["API_TOKEN", null, "Shared"], ["API_TOKEN", "w", "Deploys"]]);
  assert.equal(store.remove(token), true);
  assert.equal(store.remove(token), false);
  assert.equal(store.values(["API_TOKEN"], "w").get("API_TOKEN"), "shared");
});

test("saving again replaces the value, and a missing secret is named in the failure", () => {
  const { store } = secretsFixture();
  store.save(token);
  assert.equal(store.has(token), true);
  store.save({ ...token, value: "rotated" });
  assert.equal(store.list("w").length, 1);
  assert.equal(store.values(["API_TOKEN"], "w").get("API_TOKEN"), "rotated");
  assert.throws(() => store.values(["API_TOKEN", "MISSING"], "w"), /No saved secret is named MISSING/);
});

test("a locked keychain fails the save without writing anything, and an unreadable file starts empty", () => {
  const { store, codec, path, reopen } = secretsFixture();
  codec.locked = true;
  assert.throws(() => store.save(token), /locked/);
  assert.deepEqual(store.list("w"), []);
  codec.locked = false;
  store.save(token);
  writeFileSync(path, "{ not json");
  assert.deepEqual(reopen().list("w"), []);
});

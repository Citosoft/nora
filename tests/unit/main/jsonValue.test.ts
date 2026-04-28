import { getBoolean, getJsonArray, getJsonObject, getNumber, getString, isJsonObject } from "@main/jsonValue";
import assert from "node:assert/strict";
import test from "node:test";

test("isJsonObject identifies plain objects only", () => {
  assert.equal(isJsonObject({ key: "value" }), true);
  assert.equal(isJsonObject(["value"]), false);
  assert.equal(isJsonObject(null), false);
});

test("getJsonArray returns array input and empty array for non-arrays", () => {
  const source = [1, "two", { ok: true }];
  assert.deepEqual(getJsonArray(source), source);
  assert.deepEqual(getJsonArray("not-an-array"), []);
});

test("getJsonObject returns object input and null otherwise", () => {
  assert.deepEqual(getJsonObject({ id: "123" }), { id: "123" });
  assert.equal(getJsonObject(["invalid"]), null);
});

test("primitive getters return typed values or null", () => {
  assert.equal(getString("value"), "value");
  assert.equal(getString(123), null);

  assert.equal(getNumber(123), 123);
  assert.equal(getNumber("123"), null);

  assert.equal(getBoolean(true), true);
  assert.equal(getBoolean("true"), null);
});

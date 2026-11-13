import assert from "node:assert/strict";
import { test } from "node:test";
import { accountStateSchema } from "@shared/account/contracts";

test("account messages accept normalized identities without exposing provider sessions", () => {
  assert.equal(accountStateSchema.safeParse({ status: "signed-in", user: { id: "user_1", name: "Daniel", imageUrl: "https://img.clerk.com/avatar.png" } }).success, true);
  assert.equal(accountStateSchema.safeParse({ status: "signed-out" }).success, true);
  assert.equal(accountStateSchema.safeParse({ status: "signed-in", user: { id: "user_1", name: "Daniel", imageUrl: null }, token: "secret" }).success, false);
});
test("account messages reject executable avatar URLs and malformed state", () => {
  for (const imageUrl of ["javascript:alert(1)", "file:///private/avatar", "http://example.com/avatar"]) {
    assert.equal(accountStateSchema.safeParse({ status: "signed-in", user: { id: "user_1", name: "Daniel", imageUrl } }).success, false);
  }
  assert.equal(accountStateSchema.safeParse({ status: "signed-in" }).success, false);
  assert.equal(accountStateSchema.safeParse({ status: "error", message: "" }).success, false);
});

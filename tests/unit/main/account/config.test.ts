import assert from "node:assert/strict";
import { test } from "node:test";
import { clerkFrontendHost } from "@main/account/config";

const key = (value: string): string => `pk_test_${Buffer.from(value).toString("base64")}`;
test("derive Clerk's frontend host only from a valid publishable key", () => {
  assert.equal(clerkFrontendHost(key("example.clerk.accounts.dev$")), "example.clerk.accounts.dev");
  assert.equal(clerkFrontendHost(key("accounts.example.com$").replace("pk_test_", "pk_live_")), "accounts.example.com");
  for (const value of ["", "sk_test_secret", key("example.com"), key("example.com/evil$"), key("example.com:443$"), key("user@example.com$"), key("example.com; script-src *$"), key("-bad.example.com$")]) {
    assert.equal(clerkFrontendHost(value), null);
  }
});

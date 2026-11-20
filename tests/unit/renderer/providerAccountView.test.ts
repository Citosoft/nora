import assert from "node:assert/strict";
import test from "node:test";
import { completesSignIn, providerAccountViewFromRead, providerLoginMethodsFromRead } from "@/components/app/logic/providerAccountView";
import type { ProviderAccountView } from "@/components/app/types/providerAccount.types";
import type { ProviderAccountResult } from "@shared/types/provider/account.types";

const subscription: ProviderAccountView = { status: "ready", account: { state: "signed-in", method: "Claude Max", label: "me@example.test" } };
const consoleAccount: ProviderAccountView = { status: "ready", account: { state: "signed-in", method: "Anthropic Console", label: "me@example.test" } };
const signedOut: ProviderAccountView = { status: "ready", account: { state: "signed-out" } };
const consoleMethod = { id: "console", label: "Anthropic Console", description: "API usage billing" };

test("account reads carry the runtime's sign-in options; other replies keep the last known ones", () => {
  const read: ProviderAccountResult = { kind: "account", account: { state: "signed-out" }, loginMethods: [consoleMethod] };
  assert.deepEqual(providerAccountViewFromRead(read), signedOut);
  assert.deepEqual(providerLoginMethodsFromRead(read), [consoleMethod]);
  assert.equal(providerLoginMethodsFromRead({ kind: "unavailable", message: "Down" }), null);
});

test("sign-in completes on a new account, and on a different one when switching", () => {
  assert.equal(completesSignIn(signedOut, subscription), true);
  assert.equal(completesSignIn(undefined, subscription), true);
  assert.equal(completesSignIn({ status: "error", message: "Down" }, subscription), true);
  assert.equal(completesSignIn(subscription, subscription), false, "the old account is reported until the browser flow finishes");
  assert.equal(completesSignIn(subscription, consoleAccount), true);
  assert.equal(completesSignIn(signedOut, signedOut), false);
  assert.equal(completesSignIn(signedOut, { status: "error", message: "Down" }), false);
});


test("provider settings retain the runtime's normalized connection type for its icon", () => {
  const result: ProviderAccountResult = { kind: "account", account: consoleAccount.status === "ready" ? consoleAccount.account : { state: "unknown" }, connection: "api", loginMethods: [consoleMethod] };
  const view = providerAccountViewFromRead(result);
  assert.equal(view.status === "ready" ? view.connection : null, "api");
});

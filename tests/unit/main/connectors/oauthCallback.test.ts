import assert from "node:assert/strict";
import test from "node:test";
import { openOAuthCallback } from "@main/connectors/oauthCallback";

test("the callback resolves the code for its own state and ignores others", async (t) => {
  const callback = await openOAuthCallback(0);
  t.after(() => callback.close());
  assert.match(callback.redirectUrl, /^http:\/\/127\.0\.0\.1:\d+\/callback$/);
  const code = callback.waitForCode("expected", new AbortController().signal);
  const stranger = await fetch(`${callback.redirectUrl}?code=x&state=other`);
  assert.equal(stranger.status, 400);
  const page = await fetch(`${callback.redirectUrl}?code=granted&state=expected`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /return to Nora/);
  assert.equal(await code, "granted");
});

test("a provider error or a cancelled sign-in rejects the wait", async (t) => {
  const callback = await openOAuthCallback(0);
  t.after(() => callback.close());
  const denied = assert.rejects(callback.waitForCode("s", new AbortController().signal), /User <denied>/);
  await fetch(`${callback.redirectUrl}?error=access_denied&error_description=${encodeURIComponent("User <denied>")}&state=s`)
    .then(async (response) => assert.doesNotMatch(await response.text(), /<denied>/, "provider text is escaped"));
  await denied;
  const controller = new AbortController();
  const cancelled = callback.waitForCode("t", controller.signal);
  controller.abort(new Error("The sign-in timed out."));
  await assert.rejects(cancelled, /timed out/);
});

test("a taken preferred port falls back to a free one", async (t) => {
  const first = await openOAuthCallback(0);
  t.after(() => first.close());
  const port = Number(new URL(first.redirectUrl).port);
  const second = await openOAuthCallback(port);
  t.after(() => second.close());
  assert.notEqual(new URL(second.redirectUrl).port, String(port));
});

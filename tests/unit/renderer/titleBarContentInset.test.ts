import assert from "node:assert/strict";
import test from "node:test";
import { resolveTitleBarContentInset } from "@/components/app/logic/titleBarContentInset";

test("measures from the title bar's middle region to the content column", () => {
  assert.equal(resolveTitleBarContentInset(320, 180), 140);
});

test("stays at zero when the content column starts under the title bar controls", () => {
  assert.equal(resolveTitleBarContentInset(48, 180), 0);
});

test("rounds fractional layout positions", () => {
  assert.equal(resolveTitleBarContentInset(300.6, 180.2), 120);
});

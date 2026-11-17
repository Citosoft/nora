import { DEFAULT_UI_FONT_ID, getUiFontFamily, isUiFontId, UI_FONT_OPTIONS } from "@/components/app/logic/appUiFonts";
import assert from "node:assert/strict";
import test from "node:test";

test("ui font options include system, bundled and modern web font choices", () => {
  assert.deepEqual(
    UI_FONT_OPTIONS.map((option) => option.id),
    ["system", "inter", "geist", "manrope", "dm-sans", "space-grotesk", "outfit", "plus-jakarta-sans"]
  );
});

test("ui font helpers validate ids and return families", () => {
  assert.equal(DEFAULT_UI_FONT_ID, "system");
  assert.equal(isUiFontId("system"), true);
  assert.equal(getUiFontFamily(DEFAULT_UI_FONT_ID), "var(--app-system-font)");
  assert.equal(isUiFontId("geist"), true);
  assert.equal(isUiFontId("unknown-font"), false);
  assert.equal(getUiFontFamily("inter"), "\"Inter\"");
  assert.equal(getUiFontFamily("plus-jakarta-sans"), "\"Plus Jakarta Sans\"");
});

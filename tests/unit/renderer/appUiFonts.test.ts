import { getUiFontFamily, isUiFontId, UI_FONT_OPTIONS } from "@/components/app/logic/appUiFonts";
import assert from "node:assert/strict";
import test from "node:test";

test("ui font options include bundled and modern web font choices", () => {
  assert.deepEqual(
    UI_FONT_OPTIONS.map((option) => option.id),
    ["inter", "geist", "manrope", "dm-sans", "space-grotesk", "outfit", "plus-jakarta-sans"]
  );
});

test("ui font helpers validate ids and return families", () => {
  assert.equal(isUiFontId("geist"), true);
  assert.equal(isUiFontId("unknown-font"), false);
  assert.equal(getUiFontFamily("inter"), "\"Inter\"");
  assert.equal(getUiFontFamily("plus-jakarta-sans"), "\"Plus Jakarta Sans\"");
});

import assert from "node:assert/strict";
import test from "node:test";
import { DIFF_LINE_HEIGHT_PX, DIFF_LINE_PAGE, estimateDiffBodyHeight, nextDiffLinePage } from "@/components/app/logic/diffRenderBudget";

test("placeholder height follows the line count, capped at one page", () => {
  assert.equal(estimateDiffBodyHeight("a\nb\nc"), 3 * DIFF_LINE_HEIGHT_PX);
  assert.equal(estimateDiffBodyHeight("x\n".repeat(DIFF_LINE_PAGE * 4)), DIFF_LINE_PAGE * DIFF_LINE_HEIGHT_PX);
});

test("show more adds one page without passing the total", () => {
  assert.equal(nextDiffLinePage(DIFF_LINE_PAGE, 10_000), DIFF_LINE_PAGE * 2);
  assert.equal(nextDiffLinePage(DIFF_LINE_PAGE, DIFF_LINE_PAGE + 7), DIFF_LINE_PAGE + 7);
});

import { flattenSelectOptions } from "@/components/ui/select";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";

test("flattenSelectOptions preserves native optgroup options and labels", () => {
  const children = [
    createElement("option", { key: "empty", value: "" }, "Start without a template"),
    createElement("optgroup", { key: "improvements", label: "Improvements" }, [
      createElement("option", { key: "improve-one-area", value: "improve-one-area" }, "Improve one area"),
      createElement("option", { key: "refactor", value: "refactor-safely", disabled: true }, "Refactor safely")
    ])
  ];

  assert.deepEqual(flattenSelectOptions(children), [
    { value: "", label: "Start without a template", disabled: false, groupLabel: undefined },
    { value: "improve-one-area", label: "Improve one area", disabled: false, groupLabel: "Improvements" },
    { value: "refactor-safely", label: "Refactor safely", disabled: true, groupLabel: "Improvements" }
  ]);
});

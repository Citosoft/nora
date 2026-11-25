import assert from "node:assert/strict";
import { test } from "node:test";
import { roleSelectionLabel } from "@shared/personalization/profiles";

test("a preset role shows its label and a described role shows as Custom role", () => {
  assert.equal(roleSelectionLabel({ id: "developer" }), "Developer");
  assert.equal(roleSelectionLabel({ id: "custom", description: "Data engineer" }), "Custom role");
});

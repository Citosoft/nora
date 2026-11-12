import { findVersionInText, isNewerVersion } from "@main/helpers/semanticVersion";
import assert from "node:assert/strict";
import test from "node:test";

test("extracts versions from provider CLI --version output", () => {
  assert.equal(findVersionInText("codex-cli 0.45.0\n"), "0.45.0");
  assert.equal(findVersionInText("2.0.14 (Claude Code)"), "2.0.14");
  assert.equal(findVersionInText("unknown"), null);
});

test("compares versions numerically and ignores unparseable input", () => {
  assert.equal(isNewerVersion("0.9.0", "0.10.0"), true);
  assert.equal(isNewerVersion("1.2.3", "1.2.3"), false);
  assert.equal(isNewerVersion("2.0.0", "1.9.9"), false);
  assert.equal(isNewerVersion("dev", "1.0.0"), false);
});

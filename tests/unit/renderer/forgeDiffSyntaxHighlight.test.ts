import { tokenizeForgeDiffCode } from "@/components/app/logic/forgeDiffSyntaxHighlight";
import assert from "node:assert/strict";
import test from "node:test";

test("tokenizeForgeDiffCode highlights TypeScript keywords and literals without Monaco", () => {
  const tokens = tokenizeForgeDiffCode("const count = 42; return `value-${count}`;", "typescript");

  assert.deepEqual(
    tokens.filter((token) => token.kind !== "plain").map((token) => [token.text, token.kind]),
    [
      ["const", "keyword"],
      ["42", "number"],
      [";", "punctuation"],
      ["return", "keyword"],
      ["`value-${count}`", "string"],
      [";", "punctuation"]
    ]
  );
});

test("tokenizeForgeDiffCode highlights comments for shell-like languages", () => {
  const tokens = tokenizeForgeDiffCode("echo ready # explain status", "shell");

  assert.equal(tokens.at(-1)?.text, "# explain status");
  assert.equal(tokens.at(-1)?.kind, "comment");
});

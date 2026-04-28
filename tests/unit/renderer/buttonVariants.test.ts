import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("invisible button variant has no border or background surfaces", () => {
  const source = readFileSync(join(process.cwd(), "renderer/components/ui/button.tsx"), "utf8");

  assert.match(source, /invisible:\s*"[^"]*border-transparent/);
  assert.match(source, /invisible:\s*"[^"]*bg-transparent/);
  assert.match(source, /invisible:\s*"[^"]*hover:bg-transparent/);
});

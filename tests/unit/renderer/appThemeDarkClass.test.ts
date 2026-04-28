import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("applyTheme toggles html.dark so tailwind dark classes activate", () => {
  const source = readFileSync(join(process.cwd(), "renderer/components/app/logic/appTheme.ts"), "utf8");

  assert.match(source, /classList\.toggle\("dark", resolved === "dark"\)/);
});

test("bootstrap theme script toggles html.dark before first paint", () => {
  const source = readFileSync(join(process.cwd(), "renderer/index.html"), "utf8");

  assert.match(source, /classList\.toggle\("dark", resolved === "dark"\)/);
});

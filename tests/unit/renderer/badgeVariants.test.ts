import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("badge variants include dark-mode classes for default, secondary, and outline", () => {
  const source = readFileSync(join(process.cwd(), "renderer/components/ui/badge.tsx"), "utf8");

  assert.match(source, /default:\s*"[^"]*dark:border-primary\/30[^"]*dark:bg-primary\/20/);
  assert.match(source, /secondary:\s*"[^"]*dark:border-border\/50[^"]*dark:bg-muted\/70/);
  assert.match(source, /outline:\s*"[^"]*dark:border-border\/70[^"]*dark:bg-muted\/35/);
});

test("success badge includes tuned dark-mode styling for deployment readiness", () => {
  const source = readFileSync(join(process.cwd(), "renderer/components/ui/badge.tsx"), "utf8");

  assert.match(source, /success:\s*"[^"]*dark:border-emerald-300\/55/);
  assert.match(source, /success:\s*"[^"]*dark:bg-emerald-500\/12/);
  assert.match(source, /success:\s*"[^"]*dark:text-emerald-100/);
});

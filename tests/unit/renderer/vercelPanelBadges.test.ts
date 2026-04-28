import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("vercel current deployment badge includes explicit dark-mode classes", () => {
  const source = readFileSync(join(process.cwd(), "renderer/components/app/panels/VercelPanel.tsx"), "utf8");

  assert.match(source, /Current/);
  assert.match(source, /<Badge variant="outline" className="!border-transparent !bg-sky-600\/15 !text-sky-700 dark:!bg-sky-400\/20 dark:!text-sky-200">/);
});

test("vercel deployment status badges include explicit dark-mode classes for ready state", () => {
  const source = readFileSync(join(process.cwd(), "renderer/components/app/panels/VercelPanel.tsx"), "utf8");

  assert.match(source, /getDeploymentStatusBadgeClassName/);
  assert.match(source, /dark:!border-emerald-300\/60/);
  assert.match(source, /dark:!bg-emerald-500\/35/);
  assert.match(source, /dark:!text-emerald-50/);
  assert.match(source, /<Badge variant="outline" className=\{getDeploymentStatusBadgeClassName\(deployment\)\}>/);
});

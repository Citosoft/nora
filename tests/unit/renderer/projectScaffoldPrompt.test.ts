import { buildProjectScaffoldPrompt, resolveProjectScaffoldOptions } from "@/components/app/logic/projectScaffoldPrompt";
import type { ProjectScaffoldFramework } from "@/components/app/types/projectScaffoldWizard.types";
import assert from "node:assert/strict";
import test from "node:test";

const framework: ProjectScaffoldFramework = {
  id: "nextjs",
  label: "Next.js",
  language: "TypeScript / JavaScript",
  category: "web",
  logoUrl: "https://www.google.com/s2/favicons?domain=nextjs.org&sz=64",
  description: "React application with routing.",
  starterCommand: "npx create-next-app@latest",
  componentOptions: [
    { id: "typescript", label: "TypeScript", description: "Use typed source.", recommended: true },
    { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling." }
  ],
  testingOptions: [
    { id: "vitest", label: "Vitest", description: "Add unit tests.", recommended: true },
    { id: "playwright", label: "Playwright", description: "Add browser tests." }
  ]
};

test("resolveProjectScaffoldOptions preserves registry order and filters selected ids", () => {
  assert.deepEqual(
    resolveProjectScaffoldOptions(framework, ["tailwind", "missing", "typescript"], "componentOptions"),
    framework.componentOptions
  );
});

test("buildProjectScaffoldPrompt includes framework, starter, components, and tests", () => {
  const prompt = buildProjectScaffoldPrompt({
    framework,
    components: [framework.componentOptions[0]],
    testing: [framework.testingOptions[1]]
  });

  assert.match(prompt, /Scaffold a new Next\.js project/);
  assert.match(prompt, /Use this starter command when it is appropriate: npx create-next-app@latest\./);
  assert.match(prompt, /- TypeScript: Use typed source\./);
  assert.match(prompt, /- Playwright: Add browser tests\./);
  assert.match(prompt, /Create the project in this workspace/);
});

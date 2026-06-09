import { PROJECT_SCAFFOLD_FRAMEWORKS } from "@/components/app/constants/projectScaffoldRegistry";
import { resolveProjectScaffoldOptionLogoUrl } from "@/components/app/constants/projectScaffoldOptionLogos";
import {
  groupProjectScaffoldComponentOptions,
  resolveProjectScaffoldComponentCategory
} from "@/components/app/logic/projectScaffoldOptionGroups";
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

test("project scaffold registry has unique framework and option ids", () => {
  const frameworkIds = PROJECT_SCAFFOLD_FRAMEWORKS.map((entry) => entry.id);
  assert.equal(new Set(frameworkIds).size, frameworkIds.length);

  for (const entry of PROJECT_SCAFFOLD_FRAMEWORKS) {
    const componentIds = entry.componentOptions.map((option) => option.id);
    const testingIds = entry.testingOptions.map((option) => option.id);
    assert.equal(new Set(componentIds).size, componentIds.length, `${entry.id} has duplicate component ids`);
    assert.equal(new Set(testingIds).size, testingIds.length, `${entry.id} has duplicate testing ids`);
  }
});

test("every project scaffold option has a logo mapping", () => {
  for (const frameworkEntry of PROJECT_SCAFFOLD_FRAMEWORKS) {
    for (const option of [...frameworkEntry.componentOptions, ...frameworkEntry.testingOptions]) {
      assert.ok(
        resolveProjectScaffoldOptionLogoUrl(option.id),
        `${frameworkEntry.id} option ${option.id} is missing a logo mapping`
      );
    }
  }
});

test("project scaffold registry covers every catalog category", () => {
  const categories = new Set(PROJECT_SCAFFOLD_FRAMEWORKS.map((entry) => entry.category));

  for (const category of ["web", "backend", "mobile", "desktop", "data", "cli", "game", "monorepo"] as const) {
    assert.equal(categories.has(category), true, `${category} category is empty`);
  }
});

test("groupProjectScaffoldComponentOptions groups options without changing their category order", () => {
  const groups = groupProjectScaffoldComponentOptions([
    { id: "docker", label: "Docker", description: "Containers" },
    { id: "typescript", label: "TypeScript", description: "Types" },
    { id: "tailwind", label: "Tailwind", description: "Styles" },
    { id: "postgresql", label: "PostgreSQL", description: "Database" },
    { id: "custom-feature", label: "Custom", description: "Feature" }
  ]);

  assert.deepEqual(
    groups.map((group) => [group.category, group.options.map((option) => option.id)]),
    [
      ["foundation", ["typescript"]],
      ["ui", ["tailwind"]],
      ["data", ["postgresql"]],
      ["operations", ["docker"]],
      ["features", ["custom-feature"]]
    ]
  );
});

test("resolveProjectScaffoldComponentCategory categorizes common scaffold tools", () => {
  assert.equal(resolveProjectScaffoldComponentCategory("clerk"), "auth");
  assert.equal(resolveProjectScaffoldComponentCategory("tanstack-query"), "application");
  assert.equal(resolveProjectScaffoldComponentCategory("capacitor"), "platform");
  assert.equal(resolveProjectScaffoldComponentCategory("sentry"), "operations");
});

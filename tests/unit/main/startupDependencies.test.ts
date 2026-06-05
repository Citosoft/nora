import * as processLookup from "@main/processLookup";
import * as remoteMounts from "@main/remoteMounts";
import { getStartupDependencyReport } from "@main/startupDependencies";
import assert from "node:assert/strict";
import test from "node:test";

function mockModuleMethod<T extends object, K extends keyof T>(moduleRef: T, key: K, replacement: T[K]): () => void {
  const original = moduleRef[key];
  (moduleRef as Record<string, unknown>)[key as string] = replacement as unknown;
  return () => {
    (moduleRef as Record<string, unknown>)[key as string] = original as unknown;
  };
}

test("startup dependency report includes npm and npx entries", async (t) => {
  const restoreFindExecutable = mockModuleMethod(processLookup, "findExecutableOnPath", async (commands: string[]) => {
    const requested = commands[0] ?? "";
    if (requested.startsWith("git")) {
      return "/usr/bin/git";
    }
    if (requested.startsWith("gh")) {
      return "/usr/bin/gh";
    }
    if (requested.startsWith("npm")) {
      return "/usr/bin/npm";
    }
    if (requested.startsWith("npx")) {
      return "/usr/bin/npx";
    }
    return null;
  });
  const restoreFindSsh = mockModuleMethod(remoteMounts, "findSshExecutable", async () => null);
  const restoreDetectSsh = mockModuleMethod(remoteMounts, "detectDirectSshSupport", async () => ({
    supported: false,
    reason: "No SSH client was found on this machine."
  }));
  const restoreDetectMount = mockModuleMethod(remoteMounts, "detectRemoteMountSupport", async () => ({
    supported: false,
    provider: null,
    reason: "Mount support missing.",
    installHint: null,
    canAutoInstall: false,
    bootstrapScript: null
  }));

  t.after(() => {
    restoreDetectMount();
    restoreDetectSsh();
    restoreFindSsh();
    restoreFindExecutable();
  });

  const report = await getStartupDependencyReport();
  const ghDependency = report.dependencies.find((dependency) => dependency.id === "gh");
  const npmDependency = report.dependencies.find((dependency) => dependency.id === "npm");
  const npxDependency = report.dependencies.find((dependency) => dependency.id === "npx");

  assert.ok(ghDependency);
  assert.ok(npmDependency);
  assert.ok(npxDependency);
  assert.equal(ghDependency.status, "available");
  assert.equal(ghDependency.severity, "mandatory");
  assert.equal(npmDependency.status, "available");
  assert.equal(npxDependency.status, "available");
  assert.equal(npmDependency.severity, "optional");
  assert.equal(npxDependency.severity, "optional");
});

test("startup dependency report marks npm and npx as missing when unavailable", async (t) => {
  const restoreFindExecutable = mockModuleMethod(processLookup, "findExecutableOnPath", async (commands: string[]) => {
    const requested = commands[0] ?? "";
    if (requested.startsWith("git")) {
      return "/usr/bin/git";
    }
    return null;
  });
  const restoreFindSsh = mockModuleMethod(remoteMounts, "findSshExecutable", async () => null);
  const restoreDetectSsh = mockModuleMethod(remoteMounts, "detectDirectSshSupport", async () => ({
    supported: false,
    reason: "No SSH client was found on this machine."
  }));
  const restoreDetectMount = mockModuleMethod(remoteMounts, "detectRemoteMountSupport", async () => ({
    supported: false,
    provider: null,
    reason: "Mount support missing.",
    installHint: null,
    canAutoInstall: false,
    bootstrapScript: null
  }));

  t.after(() => {
    restoreDetectMount();
    restoreDetectSsh();
    restoreFindSsh();
    restoreFindExecutable();
  });

  const report = await getStartupDependencyReport();
  const ghDependency = report.dependencies.find((dependency) => dependency.id === "gh");
  const npmDependency = report.dependencies.find((dependency) => dependency.id === "npm");
  const npxDependency = report.dependencies.find((dependency) => dependency.id === "npx");

  assert.ok(ghDependency);
  assert.ok(npmDependency);
  assert.ok(npxDependency);
  assert.equal(ghDependency.status, "missing");
  assert.equal(ghDependency.severity, "mandatory");
  assert.equal(npmDependency.status, "missing");
  assert.equal(npxDependency.status, "missing");
  assert.equal(npmDependency.canAutoInstall, false);
  assert.equal(npxDependency.canAutoInstall, false);
  assert.equal(npmDependency.manualInstructions.length > 0, true);
  assert.equal(npxDependency.manualInstructions.length > 0, true);
});

import { getMissingInstallDependencies, getRequiredInstallDependencies } from "@/components/app/logic/toolInstallDependencies";
import type { StartupDependencyReport } from "@shared/types/startupDependency.types";
import assert from "node:assert/strict";
import test from "node:test";

test("getRequiredInstallDependencies detects npm and npx commands", () => {
  assert.deepEqual(getRequiredInstallDependencies("npm install -g @openai/codex"), ["npm"]);
  assert.deepEqual(getRequiredInstallDependencies("npx skills find react"), ["npx"]);
  assert.deepEqual(getRequiredInstallDependencies("npm exec --yes skills -- find react"), ["npm"]);
  assert.deepEqual(getRequiredInstallDependencies("powershell -Command \"npx.cmd skills find foo\""), ["npx"]);
});

test("getMissingInstallDependencies returns only unavailable dependencies", () => {
  const report: StartupDependencyReport = {
    checkedAt: "2026-04-13T00:00:00.000Z",
    dependencies: [
      {
        id: "git",
        label: "Git",
        severity: "mandatory",
        status: "available",
        summary: "",
        detectedPath: "C:\\Program Files\\Git\\cmd\\git.exe",
        installHint: null,
        canAutoInstall: false,
        autoInstallLabel: null,
        manualInstructions: []
      },
      {
        id: "npm",
        label: "npm",
        severity: "optional",
        status: "missing",
        summary: "",
        detectedPath: null,
        installHint: null,
        canAutoInstall: false,
        autoInstallLabel: null,
        manualInstructions: []
      },
      {
        id: "npx",
        label: "npx",
        severity: "optional",
        status: "available",
        summary: "",
        detectedPath: "C:\\Program Files\\nodejs\\npx.cmd",
        installHint: null,
        canAutoInstall: false,
        autoInstallLabel: null,
        manualInstructions: []
      },
      {
        id: "ssh-client",
        label: "SSH Client",
        severity: "optional",
        status: "available",
        summary: "",
        detectedPath: null,
        installHint: null,
        canAutoInstall: false,
        autoInstallLabel: null,
        manualInstructions: []
      },
      {
        id: "ssh-mount",
        label: "SSH Mount Support",
        severity: "optional",
        status: "available",
        summary: "",
        detectedPath: null,
        installHint: null,
        canAutoInstall: false,
        autoInstallLabel: null,
        manualInstructions: []
      }
    ]
  };

  assert.deepEqual(getMissingInstallDependencies("npm install -g @openai/codex", report), ["npm"]);
  assert.deepEqual(getMissingInstallDependencies("npx skills find react", report), []);
  assert.deepEqual(getMissingInstallDependencies("npm exec --yes skills -- find react", report), ["npm"]);
});

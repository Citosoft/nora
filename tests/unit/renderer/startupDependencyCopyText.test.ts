import { buildStartupDependencyCopyText } from "@/components/app/logic/startupDependencyCopyText";
import { test } from "node:test";
import assert from "node:assert/strict";

test("buildStartupDependencyCopyText returns the first install command from manual instructions", () => {
  const text = buildStartupDependencyCopyText({
    id: "git",
    label: "git",
    severity: "mandatory",
    status: "missing",
    summary: "Git is required to inspect repositories.",
    detectedPath: null,
    installHint: null,
    canAutoInstall: false,
    autoInstallLabel: null,
    manualInstructions: [
      "Install Git with Homebrew using `brew install git`, or install the Xcode Command Line Tools.",
      "Restart Nora after installation."
    ]
  });

  assert.equal(text, "brew install git");
});

test("buildStartupDependencyCopyText skips non-command backticked labels", () => {
  const text = buildStartupDependencyCopyText({
    id: "npm",
    label: "npm",
    severity: "optional",
    status: "missing",
    summary: "npm is missing.",
    detectedPath: null,
    installHint: null,
    canAutoInstall: false,
    autoInstallLabel: null,
    manualInstructions: [
      "Install Node.js LTS with your package manager so `npm` is available (for example `sudo apt-get install -y nodejs npm`).",
      "Restart Nora after installation."
    ]
  });

  assert.equal(text, "sudo apt-get install -y nodejs npm");
});

test("buildStartupDependencyCopyText returns install commands for available dependencies", () => {
  const text = buildStartupDependencyCopyText({
    id: "git",
    label: "git",
    severity: "mandatory",
    status: "available",
    summary: "Git is available.",
    detectedPath: "/usr/bin/git",
    installHint: null,
    canAutoInstall: false,
    autoInstallLabel: null,
    manualInstructions: [
      "Install Git with Homebrew using `brew install git`, or install the Xcode Command Line Tools.",
      "Restart Nora after installation."
    ]
  });

  assert.equal(text, "brew install git");
});

test("buildStartupDependencyCopyText returns null when no install command is available", () => {
  const text = buildStartupDependencyCopyText({
    id: "ssh-client",
    label: "ssh client",
    severity: "optional",
    status: "missing",
    summary: "SSH is missing.",
    detectedPath: null,
    installHint: "Install an SSH client to enable direct SSH workspaces.",
    canAutoInstall: false,
    autoInstallLabel: null,
    manualInstructions: [
      "Install the macOS command line developer tools if `ssh` is missing.",
      "Restart Nora after installation."
    ]
  });

  assert.equal(text, null);
});

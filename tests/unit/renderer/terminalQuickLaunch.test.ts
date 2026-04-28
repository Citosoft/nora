import {
  createQuickTerminalDialogDefaults,
  createQuickTerminalPayload,
  normalizeTerminalQuickLaunchName
} from "@/components/app/logic/terminalQuickLaunch";
import type { AppSettings } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const quickLaunchDefaults: AppSettings["terminalQuickLaunchDefaults"] = {
  name: "  Quick Shell  ",
  target: "root"
};

test("normalizeTerminalQuickLaunchName trims and falls back to Terminal", () => {
  assert.equal(normalizeTerminalQuickLaunchName("  Named  "), "Named");
  assert.equal(normalizeTerminalQuickLaunchName("   "), "Terminal");
});

test("createQuickTerminalPayload maps settings into a blank shell payload", () => {
  const payload = createQuickTerminalPayload("zsh", quickLaunchDefaults);

  assert.deepEqual(payload, {
    name: "Quick Shell",
    shellId: "zsh",
    target: { kind: "root" },
    launchConfig: {
      kind: "blank",
      label: "Shell",
      command: ""
    }
  });
});

test("createQuickTerminalDialogDefaults uses optional shell and quick launch target", () => {
  const defaults = createQuickTerminalDialogDefaults(null, {
    name: "   ",
    target: "session-default"
  });

  assert.deepEqual(defaults, {
    name: "Terminal",
    shellId: undefined,
    target: { kind: "session-default" },
    launchConfig: {
      kind: "blank",
      label: "Shell",
      command: ""
    }
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { parseThreadBackdropSettings, showsThreadBackdrop } from "@shared/thread-backdrop/settings";
import { captureSettings, applySettings } from "@main/settings-sync/preferences";
import { syncAppearance } from "../../helpers/settingsSync";

test("stored backdrop settings keep valid fields and default the rest", () => {
  assert.deepEqual(parseThreadBackdropSettings(undefined), { animated: true, scope: "all" });
  assert.deepEqual(parseThreadBackdropSettings({ animated: false, scope: "all" }), { animated: false, scope: "all" });
  assert.deepEqual(parseThreadBackdropSettings({ animated: "yes", scope: "everything" }), { animated: true, scope: "all" });
  assert.deepEqual(parseThreadBackdropSettings({ scope: "all" }), { animated: true, scope: "all" });
});

test("the backdrop shows on new threads, on every thread only for the all scope, and never when off", () => {
  assert.equal(showsThreadBackdrop({ animated: true, scope: "new" }, false), true);
  assert.equal(showsThreadBackdrop({ animated: true, scope: "new" }, true), false);
  assert.equal(showsThreadBackdrop({ animated: true, scope: "all" }, true), true);
  assert.equal(showsThreadBackdrop({ animated: false, scope: "all" }, false), false);
});

test("backdrop settings sync between devices", () => {
  const settings = structuredClone(DEFAULT_APP_SETTINGS);
  const expected = captureSettings(settings, syncAppearance);
  assert.deepEqual(expected.threadBackdrop, { animated: true, scope: "all" });
  const next = applySettings(settings, syncAppearance, { threadBackdrop: { animated: true, scope: "new" } }, expected, []);
  assert.deepEqual(next.threadBackdrop, { animated: true, scope: "new" });
});

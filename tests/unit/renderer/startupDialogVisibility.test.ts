import {
  shouldOpenAnalyticsConsentDialog,
  shouldRenderLoadingOnboardingDialog
} from "@/components/app/logic/startupDialogVisibility";
import assert from "node:assert/strict";
import test from "node:test";

test("analytics consent stays closed until app settings finish loading", () => {
  assert.equal(shouldOpenAnalyticsConsentDialog(false, "unknown", false), false);
});

test("analytics consent opens only for unresolved consent after onboarding", () => {
  assert.equal(shouldOpenAnalyticsConsentDialog(true, "unknown", false), true);
  assert.equal(shouldOpenAnalyticsConsentDialog(true, "unknown", true), false);
  assert.equal(shouldOpenAnalyticsConsentDialog(true, "granted", false), false);
  assert.equal(shouldOpenAnalyticsConsentDialog(true, "declined", false), false);
});

test("loading onboarding dialog only renders when onboarding is still open", () => {
  assert.equal(shouldRenderLoadingOnboardingDialog(true), true);
  assert.equal(shouldRenderLoadingOnboardingDialog(false), false);
});

import {
  readStoredUiLayout,
  readStoredPersonalWorkspaceIntroDismissed,
  dismissStoredPersonalWorkspaceIntro,
  readStoredOnboardingCompleted,
  writeStoredOnboardingCompleted
} from "@/components/app/logic/appPersistence";
import assert from "node:assert/strict";
import test from "node:test";

class LocalStorageMock {
  private values = new Map<string, string>();

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.has(key) ? this.values.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function installWindowMock(storage: LocalStorageMock): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { localStorage: storage }
  });
}

test("sidebar layout restores Memory and replaces the retired Context tab with Files", () => {
  const storage = new LocalStorageMock();
  installWindowMock(storage);
  storage.setItem("nora-ui-layout", JSON.stringify({ activeChangesPanelTab: "memory" }));
  assert.equal(readStoredUiLayout().activeChangesPanelTab, "memory");
  storage.setItem("nora-ui-layout", JSON.stringify({ activeChangesPanelTab: "instructions" }));
  assert.equal(readStoredUiLayout().activeChangesPanelTab, "instructions");
  storage.setItem("nora-ui-layout", JSON.stringify({ activeChangesPanelTab: "context" }));
  assert.equal(readStoredUiLayout().activeChangesPanelTab, "files");
});

test("personal workspace introduction stays pending until explicitly dismissed and survives reloads", () => {
  const storage = new LocalStorageMock();
  installWindowMock(storage);
  assert.equal(readStoredPersonalWorkspaceIntroDismissed(), false);
  writeStoredOnboardingCompleted(true);
  assert.equal(readStoredPersonalWorkspaceIntroDismissed(), false);
  dismissStoredPersonalWorkspaceIntro();
  installWindowMock(storage);
  assert.equal(readStoredPersonalWorkspaceIntroDismissed(), true);
  writeStoredOnboardingCompleted(false);
  assert.equal(readStoredPersonalWorkspaceIntroDismissed(), true);
});

test("readStoredOnboardingCompleted defaults to false", () => {
  const storage = new LocalStorageMock();
  installWindowMock(storage);

  assert.equal(readStoredOnboardingCompleted(), false);
});

test("writeStoredOnboardingCompleted(true) persists true", () => {
  const storage = new LocalStorageMock();
  installWindowMock(storage);

  writeStoredOnboardingCompleted(true);
  assert.equal(readStoredOnboardingCompleted(), true);
});

test("writeStoredOnboardingCompleted(false) clears persisted onboarding flag", () => {
  const storage = new LocalStorageMock();
  installWindowMock(storage);

  writeStoredOnboardingCompleted(true);
  assert.equal(readStoredOnboardingCompleted(), true);

  writeStoredOnboardingCompleted(false);
  assert.equal(readStoredOnboardingCompleted(), false);
});

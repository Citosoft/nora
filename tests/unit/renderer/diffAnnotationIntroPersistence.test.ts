import {
  readDiffAnnotationIntroSeen,
  writeDiffAnnotationIntroSeen
} from "@/components/app/logic/diffAnnotationIntroPersistence";
import assert from "node:assert/strict";
import test from "node:test";

class LocalStorageMock {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.has(key) ? this.values.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

function installWindowMock(storage: LocalStorageMock): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { localStorage: storage }
  });
}

test("readDiffAnnotationIntroSeen defaults to false before the guide is shown", () => {
  installWindowMock(new LocalStorageMock());

  assert.equal(readDiffAnnotationIntroSeen(), false);
});

test("writeDiffAnnotationIntroSeen stores the one-time guide as seen", () => {
  installWindowMock(new LocalStorageMock());

  writeDiffAnnotationIntroSeen();

  assert.equal(readDiffAnnotationIntroSeen(), true);
});

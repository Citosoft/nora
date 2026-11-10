import assert from "node:assert/strict";
import test from "node:test";
import { readUserDisplayName, writeUserDisplayName, subscribeUserDisplayName } from "@/components/app/logic/userDisplayName";

function installWindow() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }
  };
  const events = Object.assign(new EventTarget(), { localStorage: storage });
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: events });
  return { events, storage };
}

test("display names preserve the full saved name and notify local subscribers on changes", () => {
  const { storage } = installWindow();
  let updates = 0;
  const unsubscribe = subscribeUserDisplayName(() => { updates++; });
  assert.equal(readUserDisplayName(), "");
  writeUserDisplayName("  Daniel Smith  ");
  assert.equal(readUserDisplayName(), "Daniel Smith");
  assert.equal(storage.getItem("nora-user-display-name"), "Daniel Smith");
  assert.equal(updates, 1);
  writeUserDisplayName("Daniel Smith");
  assert.equal(updates, 1);
  writeUserDisplayName(" \n ");
  assert.equal(readUserDisplayName(), "");
  assert.equal(storage.getItem("nora-user-display-name"), null);
  assert.equal(updates, 2);
  unsubscribe();
  writeUserDisplayName("Ada Lovelace");
  assert.equal(updates, 2);
});

test("display name subscriptions follow relevant storage changes and clear events", () => {
  const { events, storage } = installWindow();
  let updates = 0;
  const unsubscribe = subscribeUserDisplayName(() => { updates++; });
  const storageChange = (key: string | null): void => {
    events.dispatchEvent(Object.assign(new Event("storage"), { key, storageArea: storage }));
  };
  storageChange("unrelated-setting");
  assert.equal(updates, 0);
  storage.setItem("nora-user-display-name", "  Ada Lovelace  ");
  storageChange("nora-user-display-name");
  assert.equal(updates, 1);
  assert.equal(readUserDisplayName(), "Ada Lovelace");
  storage.removeItem("nora-user-display-name");
  storageChange(null);
  assert.equal(updates, 2);
  assert.equal(readUserDisplayName(), "");
  unsubscribe();
  storageChange("nora-user-display-name");
  assert.equal(updates, 2);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createWindowStartup } from "@main/helpers/windowStartup";

test("activation waits for startup to finish before opening a renderer", () => {
  let windowCount = 0;
  let ipcRegistered = false;
  const lifecycle = createWindowStartup({
    hasWindow: () => windowCount > 0,
    createWindow: () => {
      assert.equal(ipcRegistered, true);
      windowCount += 1;
    },
    showWindow: () => {}
  });

  lifecycle.activate();
  lifecycle.activate();
  assert.equal(windowCount, 0);

  ipcRegistered = true;
  lifecycle.start();
  assert.equal(windowCount, 1);
  lifecycle.activate();
  assert.equal(windowCount, 1);
});

test("startup opens a window without activation and later activation reopens it", () => {
  let hasWindow = false;
  let created = 0;
  const lifecycle = createWindowStartup({
    hasWindow: () => hasWindow,
    createWindow: () => {
      hasWindow = true;
      created += 1;
    },
    showWindow: () => {}
  });

  lifecycle.start();
  assert.equal(created, 1);
  lifecycle.start();
  assert.equal(created, 1);

  hasWindow = false;
  lifecycle.activate();
  assert.equal(created, 2);
});

test("activation shows an existing hidden window instead of opening a second one", () => {
  let created = 0;
  let shown = 0;
  const lifecycle = createWindowStartup({
    hasWindow: () => created > 0,
    createWindow: () => { created += 1; },
    showWindow: () => { shown += 1; }
  });

  lifecycle.start();
  assert.equal(shown, 0);
  lifecycle.activate();
  lifecycle.activate();
  assert.equal(created, 1);
  assert.equal(shown, 2);
});

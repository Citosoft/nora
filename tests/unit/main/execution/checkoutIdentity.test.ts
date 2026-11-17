import assert from "node:assert/strict";
import test from "node:test";
import { checkoutIdentity } from "@main/execution/checkoutIdentity";

test("macOS checkout identity survives device renumbering but rejects directory replacement", () => {
  const info = { dev: 16777231n, ino: 123n, birthtimeNs: 456n };
  const original = checkoutIdentity("local", "/project", info, "darwin");
  assert.equal(checkoutIdentity("local", "/project", { ...info, dev: 16777230n }, "darwin"), original);
  assert.notEqual(checkoutIdentity("local", "/project", { ...info, ino: 124n }, "darwin"), original);
  assert.notEqual(checkoutIdentity("local", "/project", { ...info, birthtimeNs: 457n }, "darwin"), original);
  assert.notEqual(checkoutIdentity("remote", "/project", info, "darwin"), original);
  assert.notEqual(checkoutIdentity("local", "/other", info, "darwin"), original);
});

test("other platforms continue to distinguish devices and normalize Windows paths", () => {
  const info = { dev: 1n, ino: 123n, birthtimeNs: 456n };
  assert.notEqual(checkoutIdentity("local", "/project", info, "linux"),
    checkoutIdentity("local", "/project", { ...info, dev: 2n }, "linux"));
  assert.equal(checkoutIdentity("local", "C:/Project/", info, "win32"),
    checkoutIdentity("local", "c:\\project", info, "win32"));
});

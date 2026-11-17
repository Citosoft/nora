import assert from "node:assert/strict";
import test from "node:test";
import { linuxAutostartDirectory, linuxAutostartEntry, linuxLaunchExecutable, quoteDesktopExecArgument } from "@main/helpers/desktop-lifecycle/linuxAutostart";
import { createLoginItemAdapter, windowsLoginItemSettings } from "@main/helpers/desktop-lifecycle/loginItem";

test("XDG autostart honors absolute config home and stable AppImage path", () => {
  assert.equal(linuxAutostartDirectory({}, "/home/nora"), "/home/nora/.config/autostart");
  assert.equal(linuxAutostartDirectory({ XDG_CONFIG_HOME: "/config" }, "/home/nora"), "/config/autostart");
  assert.equal(linuxAutostartDirectory({ XDG_CONFIG_HOME: "relative" }, "/home/nora"), "/home/nora/.config/autostart");
  assert.equal(linuxLaunchExecutable({ APPIMAGE: "/apps/Nora.AppImage" }, "/tmp/mount/nora"), "/apps/Nora.AppImage");
  assert.match(linuxAutostartEntry("/my apps/Nora.AppImage"), /Exec="\/my apps\/Nora.AppImage" --hidden\n/);
  assert.equal(quoteDesktopExecArgument("/apps/100%Nora"), "/apps/100%%Nora");
  assert.equal(quoteDesktopExecArgument('/apps/a$"b'), '"/apps/a\\\\$\\\\"b"');
});
test("login adaptor writes and removes only the Nora autostart entry", async () => {
  const files = new Map<string, string>();
  const adapter = createLoginItemAdapter({ platform: "linux", app: { isPackaged: true, setLoginItemSettings() { assert.fail(); }, getLoginItemSettings: () => ({}) },
    fs: { async mkdir() {}, async writeFile(file, content) { files.set(file, content); }, async removeFile(file) { files.delete(file); } },
    env: {}, homeDirectory: "/home/nora", execPath: "/apps/nora", argv: ["nora", "--hidden"], log: assert.fail });
  await adapter.apply(true);
  assert.equal(files.size, 1);
  assert.match(files.get("/home/nora/.config/autostart/nora.desktop") ?? "", /Exec=\/apps\/nora --hidden/);
  await adapter.apply(false);
  assert.equal(files.size, 0);
  assert.equal(adapter.wasOpenedAtLogin(), true);
  assert.equal(windowsLoginItemSettings("C:\\Nora\\app-1.0\\Nora.exe", true).path, "C:\\Nora\\Update.exe");
});

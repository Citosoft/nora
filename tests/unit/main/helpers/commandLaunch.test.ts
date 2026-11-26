import { commandLaunch, isWindowsBatchFile } from "@main/helpers/commandLaunch";
import assert from "node:assert/strict";
import test from "node:test";

const windows = { platform: "win32" as const, comspec: "C:\\Windows\\system32\\cmd.exe" };

test("spawns executables directly outside Windows batch shims", () => {
  assert.deepEqual(commandLaunch("/opt/homebrew/bin/codex", ["app-server"], { platform: "darwin" }),
    { command: "/opt/homebrew/bin/codex", args: ["app-server"], windowsVerbatimArguments: false });
  assert.deepEqual(commandLaunch("C:\\Users\\Dad\\.local\\bin\\codex.exe", ["app-server"], windows),
    { command: "C:\\Users\\Dad\\.local\\bin\\codex.exe", args: ["app-server"], windowsVerbatimArguments: false });
});

test("detects batch shims only on Windows", () => {
  assert.equal(isWindowsBatchFile("C:\\npm\\codex.CMD", "win32"), true);
  assert.equal(isWindowsBatchFile("C:\\npm\\tool.bat", "win32"), true);
  assert.equal(isWindowsBatchFile("C:\\npm\\codex.exe", "win32"), false);
  assert.equal(isWindowsBatchFile("/usr/local/bin/codex.cmd", "darwin"), false);
});

test("runs an npm shim through cmd.exe with its path and arguments escaped", () => {
  const launch = commandLaunch("C:\\Users\\John Smith\\AppData\\Roaming\\npm\\codex.cmd", ["app-server", "--listen", "stdio://"], windows);
  assert.equal(launch.command, "C:\\Windows\\system32\\cmd.exe");
  assert.equal(launch.windowsVerbatimArguments, true);
  assert.deepEqual(launch.args, ["/d", "/s", "/c",
    "\"C:\\Users\\John^ Smith\\AppData\\Roaming\\npm\\codex.cmd ^^^\"app-server^^^\" ^^^\"--listen^^^\" ^^^\"stdio://^^^\"\""]);
});

test("escapes quotes, backslashes and cmd metacharacters in shim arguments", () => {
  const [, , , line] = commandLaunch("C:\\npm\\codex.cmd", ['web_search="disabled"', "a&b|c", "dir\\", "%PATH%"], windows).args;
  assert.equal(line, "\"C:\\npm\\codex.cmd "
    + "^^^\"web_search=\\^^^\"disabled\\^^^\"^^^\" "
    + "^^^\"a^^^&b^^^|c^^^\" "
    + "^^^\"dir\\\\^^^\" "
    + "^^^\"^^^%PATH^^^%^^^\"\"");
});

test("falls back to cmd.exe when ComSpec is unset", () => {
  assert.equal(commandLaunch("C:\\npm\\codex.cmd", [], { platform: "win32" }).command, "cmd.exe");
});

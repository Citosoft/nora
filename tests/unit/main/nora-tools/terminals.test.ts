import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTerminalList,
  pasteTextWithoutSubmit
} from "@main/nora-tools/operations/terminals";
import type { NoraTerminalInfo } from "@main/types/nora-tools/noraTools.types";
import type { NoraTerminalStore } from "@main/types/nora-tools/operations.types";
import { conversation, noraFixture, workspace } from "./fixture";

test("pasteTextWithoutSubmit strips one trailing newline and rejects empty text", () => {
  assert.equal(pasteTextWithoutSubmit("ls\n"), "ls");
  assert.equal(pasteTextWithoutSubmit("ls\r\n"), "ls");
  assert.equal(pasteTextWithoutSubmit("printf 'a\\n'\n"), "printf 'a\\n'");
  assert.throws(() => pasteTextWithoutSubmit("\n"), /empty/);
});

test("formatTerminalList describes open terminals", () => {
  const terminals: NoraTerminalInfo[] = [{
    id: "local-1", name: "Local Terminal", kind: "local", status: "running", host: "local",
    cwd: "/home", branch: null, lastLine: "ssh>", busy: false
  }];
  assert.match(formatTerminalList(terminals), /Local Terminal \(id local-1; kind local/);
  assert.match(formatTerminalList([]), /open_terminal/);
});

test("terminal operations list, open and paste through the store, scoped to the thread workspace", async () => {
  const pastes: string[] = [];
  const opens: string[] = [];
  const local = {
    id: "local-1", name: "Local Terminal", kind: "local" as const, status: "running", host: "local",
    cwd: "/home", branch: null, lastLine: "", busy: false
  };
  const store: NoraTerminalStore = {
    list(shellProjectId) {
      assert.equal(shellProjectId, "shell-w");
      return [local];
    },
    async open(input) {
      opens.push(input.kind === "workspace" ? `${input.kind}:${input.shellProjectId}:${input.name ?? ""}` : input.kind);
      return local;
    },
    async paste(id, text) {
      pastes.push(`${id}:${text}`);
      return { ...local, id };
    }
  };
  const f = noraFixture({ terminals: store });
  const context = { conversation: conversation("plain", { workspace }), audience: "nora" as const };
  assert.equal(f.deps.terminals.list(context)[0]?.id, "local-1");
  await f.deps.terminals.open({ kind: "workspace", name: "SSH" }, context);
  assert.deepEqual(opens, ["workspace:shell-w:SSH"]);
  await f.deps.terminals.paste("local-1", "systemctl status nginx\n", context);
  assert.deepEqual(pastes, ["local-1:systemctl status nginx"]);
});

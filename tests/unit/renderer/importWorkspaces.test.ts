import assert from "node:assert/strict";
import { test } from "node:test";
import { importWorkspaces } from "@/components/app/logic/importWorkspaces";

test("imports only selected pending projects sequentially, continues on failure and retries failed projects", async () => {
  const opened: string[] = [];
  const imported = ["existing"];
  let active = false;
  const failures = await importWorkspaces(["existing", "one", "bad", "two", "one", "state-error"], imported, {
    async openProject(path) {
      assert.equal(active, false);
      active = true;
      opened.push(path);
      await Promise.resolve();
      active = false;
      if (path === "bad") throw new Error("Folder unavailable");
      return { errorMessage: path === "state-error" ? "Cannot open project" : null };
    },
    onImported: (path) => imported.push(path)
  });
  assert.deepEqual(opened, ["one", "bad", "two", "state-error"]);
  assert.deepEqual(imported, ["existing", "one", "two"]);
  assert.deepEqual(failures, [{ path: "bad", message: "Folder unavailable" }, { path: "state-error", message: "Cannot open project" }]);
  const retried: string[] = [];
  assert.deepEqual(await importWorkspaces(["one", "bad", "two"], imported, {
    openProject: async (path) => { retried.push(path); return { errorMessage: null }; },
    onImported: (path) => imported.push(path)
  }), []);
  assert.deepEqual(retried, ["bad"]);
});

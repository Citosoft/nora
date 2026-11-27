import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAppImportLedger, EMPTY_APP_IMPORT_LEDGER, normalizeAppImportLedger } from "@main/app-import/ledger";
import { createJsonFileStore } from "@main/helpers/jsonFileStore";

test("the import ledger persists recorded keys and treats an unreadable file as empty", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "nora-app-import-ledger-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, "app-import-ledger.json");
  let id = 0;
  const open = () => createAppImportLedger(createJsonFileStore({ path: file, nextId: () => String(++id), empty: EMPTY_APP_IMPORT_LEDGER, normalize: normalizeAppImportLedger }), () => "2026-11-27T12:00:00.000Z");
  await open().record(["t3-code:workspace:a"]);
  await open().record(["orca:thread:b"]);
  assert.deepEqual([...await open().importedKeys()].sort(), ["orca:thread:b", "t3-code:workspace:a"]);
  await writeFile(file, "{ not json");
  assert.deepEqual([...await open().importedKeys()], []);
});

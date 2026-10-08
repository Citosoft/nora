import { queryReadOnlySqlite } from "@main/helpers/readOnlySqlite";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const createItemTable = async (): Promise<string> => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "nora-readonly-sqlite-"));
  const databasePath = path.join(directory, "state.vscdb");
  const database = new DatabaseSync(databasePath);
  database.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)");
  const insert = database.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)");
  insert.run("cursorAuth/cachedEmail", "dev@example.com");
  insert.run("cursorAuth/stripeMembershipType", "pro");
  insert.run("other/key", "ignored");
  database.close();
  return databasePath;
};

test("queryReadOnlySqlite returns rows for bound parameters", async () => {
  const databasePath = await createItemTable();
  const rows = queryReadOnlySqlite(
    databasePath,
    "SELECT key, value FROM ItemTable WHERE key IN (?, ?) ORDER BY key",
    ["cursorAuth/cachedEmail", "cursorAuth/stripeMembershipType"]
  );

  assert.deepEqual(rows?.map((row) => ({ ...row })), [
    { key: "cursorAuth/cachedEmail", value: "dev@example.com" },
    { key: "cursorAuth/stripeMembershipType", value: "pro" }
  ]);
});

test("queryReadOnlySqlite returns null for missing files, unknown schemas, and writes", async () => {
  const databasePath = await createItemTable();
  assert.equal(queryReadOnlySqlite(path.join(path.dirname(databasePath), "missing.db"), "SELECT 1"), null);
  assert.equal(queryReadOnlySqlite(databasePath, "SELECT title FROM threads"), null);
  assert.equal(queryReadOnlySqlite(databasePath, "DELETE FROM ItemTable"), null);

  const stillThere = queryReadOnlySqlite(databasePath, "SELECT count(*) AS total FROM ItemTable");
  assert.equal(stillThere?.[0]?.total, 3);
});

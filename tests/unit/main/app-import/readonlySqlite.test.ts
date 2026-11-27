import assert from "node:assert/strict";
import { test } from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openReadonlySqlite, sqliteSelectList } from "@main/app-import/readonlySqlite";
import { withTempHome } from "../../helpers/appImport";

test("read-only open sees WAL rows of a running writer and cannot write", async () => {
  await withTempHome(async (home) => {
    const file = path.join(home, "app.sqlite");
    const writer = new DatabaseSync(file);
    writer.exec("PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0; CREATE TABLE items (id TEXT); INSERT INTO items VALUES ('a'), ('b');");
    const reader = openReadonlySqlite(file);
    try {
      assert.equal(reader.prepare("SELECT count(*) AS count FROM items").get()?.count, 2);
      assert.throws(() => reader.exec("INSERT INTO items VALUES ('c')"));
      assert.equal(sqliteSelectList(reader, "items", ["id", "missing"], "i"), "i.id, NULL AS missing");
    } finally {
      reader.close();
      writer.close();
    }
  });
});

test("read-only open of a checkpointed database leaves its files untouched", async () => {
  await withTempHome(async (home) => {
    const file = path.join(home, "closed.sqlite");
    const writer = new DatabaseSync(file);
    writer.exec("PRAGMA journal_mode = WAL; CREATE TABLE items (id TEXT); INSERT INTO items VALUES ('a');");
    writer.close();
    const before = await readFile(file);
    const filesBefore = await readdir(home);
    const reader = openReadonlySqlite(file);
    assert.equal(reader.prepare("SELECT count(*) AS count FROM items").get()?.count, 1);
    reader.close();
    assert.deepEqual(await readFile(file), before);
    assert.deepEqual(await readdir(home), filesBefore);
  });
});

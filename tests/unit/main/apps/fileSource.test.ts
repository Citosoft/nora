import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { parseFileSource, resolveFileSourcePath } from "@main/apps/fileSource";

test("CSV and TSV become objects keyed by the first line with numbers typed, JSON is parsed, and other files are refused", () => {
  assert.deepEqual(parseFileSource("/x/leads.csv", "name,value,stage\nAda,12000,lead\n\"Rex, Jr\",3400,\n"), [{ name: "Ada", value: 12000, stage: "lead" }, { name: "Rex, Jr", value: 3400, stage: null }]);
  assert.deepEqual(parseFileSource("/x/a.tsv", "a\tb\n1\t2\n"), [{ a: 1, b: 2 }]);
  assert.deepEqual(parseFileSource("/x/a.json", "{\"items\":[1]}"), { items: [1] });
  assert.throws(() => parseFileSource("/x/a.json", "{nope"), /not valid JSON/);
  assert.throws(() => parseFileSource("/x/a.xlsx", "x"), /Only csv, tsv, json files/);
});

test("paths are absolute or under the home folder", () => {
  assert.equal(resolveFileSourcePath("~/Documents/a.csv", "/Users/me"), resolve("/Users/me", "Documents/a.csv"));
  assert.equal(resolveFileSourcePath("/tmp/a.csv", "/Users/me"), "/tmp/a.csv");
  assert.throws(() => resolveFileSourcePath("Documents/a.csv", "/Users/me"), /absolute or start with ~/);
});

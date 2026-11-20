import assert from "node:assert/strict";
import test from "node:test";
import { delimiterForFile, parseDelimitedRows, parseDelimitedTable } from "@shared/text/delimited";

test("CSV and TSV files get their delimiter; semicolon CSVs are recognised from the first line", () => {
  assert.equal(delimiterForFile("data/report.csv", "a,b\n1,2"), ",");
  assert.equal(delimiterForFile("REPORT.CSV", "name;amount\nTea;1,50"), ";");
  assert.equal(delimiterForFile("data.tsv", "a\tb"), "\t");
  assert.equal(delimiterForFile("notes.txt", "a,b"), null);
});

test("quoting follows RFC 4180: doubled quotes, delimiters and newlines inside quotes, CRLF and a byte-order mark", () => {
  assert.deepEqual(parseDelimitedRows("﻿name,quote\r\n\"Smith, J\",\"He said \"\"hi\"\"\"\r\n\"multi\nline\",x\n", ",").rows,
    [["name", "quote"], ["Smith, J", "He said \"hi\""], ["multi\nline", "x"]]);
  assert.deepEqual(parseDelimitedRows("a,b\n1,\n,", ",").rows, [["a", "b"], ["1", ""], ["", ""]]);
  assert.deepEqual(parseDelimitedRows("a,5\" screen", ",").rows, [["a", "5\" screen"]], "a quote inside a cell is literal");
});

test("tables use the first row as headings, pad ragged rows and mark numeric columns", () => {
  const table = parseDelimitedTable("month,value,note\nJan,1,200.5\nFeb,\"1,200\"\nMar,-3e2,15%\n", ",");
  assert.deepEqual(table.header, ["month", "value", "note"]);
  assert.deepEqual(table.rows, [["Jan", "1", "200.5"], ["Feb", "1,200", ""], ["Mar", "-3e2", "15%"]]);
  assert.deepEqual(table.numericColumns, [false, true, true]);
  assert.equal(table.totalRows, 3);
  assert.equal(table.truncated, false);
  assert.deepEqual(parseDelimitedTable("", ","), { header: [], rows: [], numericColumns: [], totalRows: 0, truncated: false });
});

test("large files show the first rows and report the full count", () => {
  const text = ["n", ...Array.from({ length: 6000 }, (_, index) => String(index))].join("\n");
  const table = parseDelimitedTable(text, ",");
  assert.equal(table.rows.length, 5000);
  assert.equal(table.totalRows, 6000);
  assert.equal(table.truncated, true);
});

import type { DelimitedTable } from "@shared/types/text/delimited.types";

/** Enough to read a file at a glance without making the table slow to render. */
const MAX_ROWS = 5000;
const MAX_COLUMNS = 200;
const NUMBER = /^[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d+)?(?:[eE][-+]?\d+)?%?$/;

/**
 * The delimiter for a CSV or TSV file, or null for other files. CSV files that use semicolons, common where the
 * decimal mark is a comma, are recognised from their first line.
 */
export function delimiterForFile(path: string, content: string): string | null {
  if (/\.tsv$/i.test(path)) return "\t";
  if (!/\.csv$/i.test(path)) return null;
  const end = content.indexOf("\n");
  const firstLine = end === -1 ? content : content.slice(0, end);
  const count = (character: string) => firstLine.split(character).length - 1;
  return count(";") > count(",") ? ";" : ",";
}

/** Splits delimited text into rows of cells, following RFC 4180 quoting: doubled quotes, and delimiters or newlines inside quotes. */
export function parseDelimitedRows(text: string, delimiter: string, maxRows = Number.POSITIVE_INFINITY): { rows: string[][]; complete: boolean } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      if (character !== "\"") cell += character;
      else if (source[index + 1] === "\"") { cell += "\""; index++; }
      else quoted = false;
    } else if (character === "\"" && cell === "") quoted = true;
    else if (character === delimiter) { row.push(cell); cell = ""; }
    else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index++;
      row.push(cell); rows.push(row); row = []; cell = "";
      if (rows.length >= maxRows) return { rows, complete: index >= source.length - 1 };
    } else cell += character;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return { rows, complete: true };
}

/** A CSV or TSV file as a table: the first row as headings, columns padded to the widest row, and numeric columns marked. */
export function parseDelimitedTable(text: string, delimiter: string): DelimitedTable {
  const { rows, complete } = parseDelimitedRows(text, delimiter, MAX_ROWS + 1);
  const totalRows = complete ? Math.max(rows.length - 1, 0) : countRows(text, delimiter) - 1;
  const width = Math.min(Math.max(0, ...rows.map((cells) => cells.length)), MAX_COLUMNS);
  const pad = (cells: string[]) => Array.from({ length: width }, (_, column) => cells[column] ?? "");
  const [first = [], ...rest] = rows;
  const body = rest.slice(0, MAX_ROWS).map(pad);
  const numericColumns = Array.from({ length: width }, (_, column) => {
    const values = body.map((cells) => cells[column].trim()).filter(Boolean);
    return values.length > 0 && values.every((value) => NUMBER.test(value));
  });
  const truncated = !complete || rest.length > MAX_ROWS || rows.some((cells) => cells.length > MAX_COLUMNS);
  return { header: pad(first), rows: body, numericColumns, totalRows, truncated };
}

function countRows(text: string, delimiter: string): number {
  return parseDelimitedRows(text, delimiter).rows.length;
}

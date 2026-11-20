import { readFile, stat } from "node:fs/promises";
import { watchFile, unwatchFile } from "node:fs";
import { homedir } from "node:os";
import { extname, isAbsolute, resolve } from "node:path";
import { APP_FILE_SOURCE_EXTENSIONS } from "@shared/apps/contracts";
import { delimiterForFile, parseDelimitedRows } from "@shared/text/delimited";
import { ConnectorToolError } from "@main/connectors/toolError";
import type { JsonValue } from "@main/jsonValue";
import type { AppFileSourceReader } from "@main/types/apps/fileSource.types";

const MAX_BYTES = 5 * 1024 * 1024;
const WATCH_INTERVAL_MS = 2_000;
const NUMBER = /^[-+]?\d+(?:\.\d+)?$/;

/** `~/...` is the user's home; anything else must be absolute, so a source never depends on where Nora was started. */
export function resolveFileSourcePath(path: string, home = homedir()): string {
  const expanded = path === "~" ? home : path.startsWith("~/") ? resolve(home, path.slice(2)) : path;
  if (!isAbsolute(expanded)) throw new ConnectorToolError("unavailable", `File paths must be absolute or start with ~: ${path}`);
  return expanded;
}

/** CSV and TSV become one object per line keyed by the first line, with plain numbers as numbers; JSON is parsed as it is. */
export function parseFileSource(path: string, text: string): JsonValue {
  const extension = extname(path).slice(1).toLowerCase();
  if (extension === "json") {
    try { return JSON.parse(text) as JsonValue; } catch { throw new ConnectorToolError("tool-failed", `${path} is not valid JSON.`); }
  }
  const delimiter = delimiterForFile(path, text);
  if (!delimiter) throw new ConnectorToolError("unavailable", `Only ${APP_FILE_SOURCE_EXTENSIONS.join(", ")} files can be sources; ${path} is neither.`);
  const { rows } = parseDelimitedRows(text, delimiter);
  const [header = [], ...body] = rows;
  const keys = header.map((cell, index) => cell.trim() || `column${index + 1}`);
  return body.filter((cells) => cells.some((cell) => cell.trim() !== "")).map((cells) => Object.fromEntries(keys.map((key, index) => {
    const cell = (cells[index] ?? "").trim();
    return [key, cell === "" ? null : NUMBER.test(cell) ? Number(cell) : cell];
  })));
}

export function createFileSourceReader(home = homedir()): AppFileSourceReader {
  return {
    async read(path) {
      const resolved = resolveFileSourcePath(path, home);
      let size: number;
      try { size = (await stat(resolved)).size; } catch { throw new ConnectorToolError("unavailable", `${path} was not found.`); }
      if (size > MAX_BYTES) throw new ConnectorToolError("unavailable", `${path} is ${(size / 1024 / 1024).toFixed(1)} MB; files over ${MAX_BYTES / 1024 / 1024} MB cannot be sources.`);
      return parseFileSource(resolved, await readFile(resolved, "utf8"));
    },
    watch(path, onChange) {
      let resolved: string;
      try { resolved = resolveFileSourcePath(path, home); } catch { return () => undefined; }
      const listener = (current: { mtimeMs: number }, previous: { mtimeMs: number }): void => { if (current.mtimeMs !== previous.mtimeMs) onChange(); };
      watchFile(resolved, { interval: WATCH_INTERVAL_MS }, listener);
      return () => unwatchFile(resolved, listener);
    }
  };
}

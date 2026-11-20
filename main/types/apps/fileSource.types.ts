import type { JsonValue } from "@main/jsonValue";

/** Reads and watches the files app sources point at; injectable so tests need no disk. */
export interface AppFileSourceReader {
  /** The file as a source sees it: rows for CSV and TSV, the parsed value for JSON. Throws a ConnectorToolError the source state can show. */
  read(path: string): Promise<JsonValue>;
  /** Calls back whenever the file changes, until the returned function runs. */
  watch(path: string, onChange: () => void): () => void;
}

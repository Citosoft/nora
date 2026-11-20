import type { JsonValue } from "@main/jsonValue";

/** Shaped rows for one source; `truncated` when the expression produced more than the window is sent. */
export interface SelectedRows { rows: JsonValue; truncated: boolean; }

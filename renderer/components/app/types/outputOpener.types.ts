import type { OpenWorkspaceFileEditorOptions } from "./workflow.types";
import type { OutputHost } from "./toolImage.types";

/** What opening an output needs: the checkout it belongs to, the thread's output host, and the file viewer when available. */
/** Where an output opened: a file viewer tab (by its path), the operating system, or nowhere yet (`unsupported`). */
export type OutputOpenResult = { opened: "viewer"; path: string } | { opened: "system" } | { opened: "unsupported" };
export interface OutputOpenerDeps {
  rootPath: string;
  host: OutputHost | null;
  openFileEditor: ((path: string, options?: OpenWorkspaceFileEditorOptions) => Promise<void>) | null;
  /** What to do with a file the viewer can't show: open it with the system right away, or report it for the caller to offer. */
  unsupported?: "open-with-system" | "report";
}

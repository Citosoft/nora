import type { ToolActivity } from "@shared/types/conversation/contracts.types";
import type { OutputFileContent, OutputFileSize, ToolImagePreview } from "@shared/types/conversation/queries.types";
import type { ThreadOutputTarget } from "./threadOutputs.types";

/** What a thread's views may do with its items' output files; the host only serves files an item recorded. */
export interface OutputHost {
  read(itemId: string, path: string, size: OutputFileSize): Promise<OutputFileContent | null>;
  openWithSystem(itemId: string, path: string): Promise<void>;
}
export type ToolImageLoadState =
  | { status: "loading" }
  | { status: "ready"; preview: ToolImagePreview }
  | { status: "unavailable"; message: string };
export interface ToolImageEntryProps {
  tool: ToolActivity;
  paths: readonly string[];
  host: OutputHost;
  /** Opens an image in the file viewer; without it, previews are not interactive. */
  onOpen?: (target: ThreadOutputTarget) => Promise<void>;
}
export interface ToolImageFigureProps extends Omit<ToolImageEntryProps, "paths"> { path: string; }

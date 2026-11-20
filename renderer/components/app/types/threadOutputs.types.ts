/** What a non-code output is, for its label. */
export type ThreadOutputKind = "image" | "video" | "audio" | "sheet" | "archive" | "document";
/**
 * A non-code file the thread produced: one a tool call wrote or delivered (stored with an absolute path on the
 * owning host), or one a reviewed turn added or modified in the checkout (a checkout-relative path).
 */
export type ThreadOutput =
  | { source: "tool"; key: string; kind: ThreadOutputKind; itemId: string; path: string; name: string; description: string | null; createdAt: string }
  | { source: "workspace"; key: string; kind: ThreadOutputKind; itemId: string; path: string; name: string; createdAt: string };
/** Enough to open an output through the item that recorded it: a tool's stored file, or a reviewed turn's checkout-relative file. */
export type ThreadOutputTarget = Pick<Extract<ThreadOutput, { source: "tool" }>, "source" | "itemId" | "path"> | Pick<Extract<ThreadOutput, { source: "workspace" }>, "source" | "itemId" | "path">;
export interface ThreadOutputsProps {
  outputs: readonly ThreadOutput[];
  /** True when earlier turns are not loaded, so the list may be missing outputs. */
  partial: boolean;
  onOpen(output: ThreadOutputTarget): Promise<void>;
}

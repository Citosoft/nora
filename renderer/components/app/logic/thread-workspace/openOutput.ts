import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { OutputOpenerDeps, OutputOpenResult } from "@/components/app/types/outputOpener.types";
import type { ThreadOutputTarget } from "@/components/app/types/threadOutputs.types";
import type { OutputHost } from "@/components/app/types/toolImage.types";
import { resolveWorkspaceFileViewKind } from "@shared/workspaceFileViewKind";
import { checkoutRelativePath } from "./outputs";

/** A thread's output host: it names files only through the item that recorded them. */
export function createOutputHost(client: ConversationClient, conversationId: string): OutputHost {
  return {
    read: (itemId, path, size) => client.outputFile(conversationId, itemId, path, size),
    openWithSystem: (itemId, path) => client.openOutputFile(conversationId, itemId, path)
  };
}

/**
 * Opens an output in the file viewer whenever it can show it. Checkout images and documents open there directly.
 * Anything else is first read through its item, which tells text from binary: checkout text then opens editable,
 * and files elsewhere open read-only with the content the host served. Files the viewer can't show (media,
 * archives, large or binary files) open with the operating system, or are reported when the caller offers that itself.
 */
export async function openOutput({ rootPath, host, openFileEditor, unsupported = "open-with-system" }: OutputOpenerDeps, target: ThreadOutputTarget): Promise<OutputOpenResult> {
  const inCheckout = target.source === "workspace" ? target.path : checkoutRelativePath(rootPath, target.path);
  const viewKind = resolveWorkspaceFileViewKind(target.path);
  const openInCheckout = async (path: string): Promise<OutputOpenResult> => {
    if (!openFileEditor) throw new Error("Files can't be opened from this view.");
    await openFileEditor(path, { selectChange: false, rootPath });
    return { opened: "viewer", path };
  };
  if (inCheckout && viewKind !== "text") return openInCheckout(inCheckout);
  if (!host) throw new Error("This thread is still loading.");
  const file = openFileEditor ? await host.read(target.itemId, target.path, "preview") : { kind: "unsupported" as const };
  if (!file) throw new Error("This file is no longer available on the machine that made it.");
  if (file.kind === "unsupported" || !openFileEditor) {
    if (unsupported === "report") return { opened: "unsupported" };
    await host.openWithSystem(target.itemId, target.path);
    return { opened: "system" };
  }
  if (inCheckout) return openInCheckout(inCheckout);
  await openFileEditor(target.path, { selectChange: false, isReadOnly: true, prefetched: file.kind === "text"
    ? { kind: "text", content: file.text } : { kind: "image", dataUrl: file.preview.dataUrl, mimeType: "image/webp" } });
  return { opened: "viewer", path: target.path };
}

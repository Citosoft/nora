import type { ThreadOutputKind } from "@/components/app/types/threadOutputs.types";

/** Display order and labels for output kinds, shared by the thread Outputs list and the workspace Library. */
export const OUTPUT_KINDS: readonly { kind: ThreadOutputKind; label: string; plural: string }[] = [
  { kind: "image", label: "Image", plural: "Images" },
  { kind: "document", label: "Document", plural: "Documents" },
  { kind: "sheet", label: "Spreadsheet", plural: "Spreadsheets" },
  { kind: "video", label: "Video", plural: "Videos" },
  { kind: "audio", label: "Audio", plural: "Audio" },
  { kind: "archive", label: "Archive", plural: "Archives" }
];

export function outputKindLabel(kind: ThreadOutputKind): string {
  return OUTPUT_KINDS.find((entry) => entry.kind === kind)?.label ?? kind;
}

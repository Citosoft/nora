import { useRef } from "react";
import { File, Loader2, Paperclip, X } from "lucide-react";
import { NativeComposerImageThumbnail } from "./NativeComposerImageThumbnail";
import { Button } from "@/components/ui/button";
import type { NativeComposerAttachmentsProps } from "@/components/app/types/composerAttachments.types";

export function NativeComposerAttachments({ attachments, disabled, saving, error, onFiles, onRemove, trailingAction }: NativeComposerAttachmentsProps) {
  const picker = useRef<HTMLInputElement>(null);
  return <div className="space-y-2">
    {!!attachments.length && <ul aria-label="Attached files" className="flex flex-wrap gap-2">
      {attachments.map((file) => <li key={file.id} className="flex min-w-0 max-w-full items-center gap-1 rounded-md border bg-muted/40 py-1 pl-2 pr-1 text-xs" title={file.name}>
        {file.mimeType.startsWith("image/") ? <NativeComposerImageThumbnail attachment={file} /> : <File className="size-3.5 shrink-0" aria-hidden="true" />}
        <span className="max-w-48 truncate">{file.name}</span>
        <Button type="button" variant="ghost" size="icon" className="size-5 shrink-0" disabled={disabled || saving}
          aria-label={`Remove ${file.name}`} onClick={() => onRemove(file.id)}><X className="size-3" aria-hidden="true" /></Button>
      </li>)}
    </ul>}
    <input ref={picker} type="file" multiple hidden disabled={disabled || saving} aria-label="Choose attachments"
      onChange={(event) => { onFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ""; }} />
    <div className="flex flex-wrap items-center gap-1">
    <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground" disabled={disabled || saving}
      title="Attach files (up to 10 files, 20 MB each), or paste or drop them here" onClick={() => picker.current?.click()}>
      {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Paperclip className="size-3.5" aria-hidden="true" />}
      {saving ? "Saving attachments…" : "Attach files"}
    </Button>
    {trailingAction}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}

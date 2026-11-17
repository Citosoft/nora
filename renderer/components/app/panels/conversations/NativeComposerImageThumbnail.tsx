import { Image } from "lucide-react";
import { useComposerAttachmentThumbnail } from "@/components/app/hooks/useComposerAttachmentThumbnail";
import type { ComposerImageThumbnailProps } from "@/components/app/types/composerAttachments.types";

export function NativeComposerImageThumbnail({ attachment }: ComposerImageThumbnailProps) {
  const thumbnail = useComposerAttachmentThumbnail(attachment.path);
  return <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
    {thumbnail ? <img src={thumbnail} alt={`Preview of ${attachment.name}`} className="size-full object-contain" />
      : <Image className="size-5 text-muted-foreground" aria-hidden="true" />}
  </span>;
}

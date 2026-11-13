import { useEffect, useState } from "react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";

export function useComposerAttachmentThumbnail(path: string) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setThumbnail(null);
    void noraSystemClient.readComposerAttachmentThumbnail(path).then(
      (dataUrl) => { if (!cancelled) setThumbnail(dataUrl); },
      () => { if (!cancelled) setThumbnail(null); }
    );
    return () => { cancelled = true; };
  }, [path]);
  return thumbnail;
}

import { resolveProductIconSources } from "@/components/app/logic/productIcon";
import type { ProductIconProps } from "@/components/app/types/productIcon.types";
import { useEffect, useMemo, useState } from "react";

export function ProductIcon({ sourceUrl, onFinalError, ...imageProps }: ProductIconProps) {
  const normalizedSourceUrl = sourceUrl?.trim() ?? "";
  const sources = useMemo(() => {
    if (!normalizedSourceUrl) {
      return [];
    }

    const resolved = resolveProductIconSources(normalizedSourceUrl);
    return resolved.localUrl ? [resolved.localUrl, resolved.remoteUrl] : [resolved.remoteUrl];
  }, [normalizedSourceUrl]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [normalizedSourceUrl]);

  const currentSource = sources[sourceIndex];
  if (!currentSource) {
    return null;
  }

  return (
    <img
      {...imageProps}
      src={currentSource}
      onError={() => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((currentIndex) => currentIndex + 1);
          return;
        }
        onFinalError?.();
      }}
    />
  );
}

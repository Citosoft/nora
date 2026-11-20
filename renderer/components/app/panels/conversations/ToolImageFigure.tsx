import { useState } from "react";
import { Image, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToolImage } from "@/components/app/hooks/useToolImage";
import { outputFileName } from "@/components/app/logic/thread-workspace/outputs";
import type { ToolImageFigureProps } from "@/components/app/types/toolImage.types";

const IMAGE_CLASS = "h-auto max-h-[512px] w-auto max-w-full rounded-lg border border-border bg-muted/30 object-contain";

/** One output image of a tool call, previewed in place; selecting it opens it in the file viewer. */
export function ToolImageFigure({ tool, path, host, onOpen }: ToolImageFigureProps) {
  const { state, retry } = useToolImage(host, tool.id, path);
  const [openError, setOpenError] = useState<string | null>(null);
  const name = outputFileName(path);
  const prompt = tool.details?.category === "image" ? tool.details.input?.trim() || null : null;
  const open = (): void => {
    if (!onOpen) return;
    setOpenError(null);
    onOpen({ source: "tool", itemId: tool.id, path }).catch((error: unknown) => setOpenError(error instanceof Error ? error.message : `${name} could not be opened.`));
  };
  return <figure className="min-w-0 space-y-2" aria-label={name}>
    {state.status === "loading" && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
      <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />Loading {name}…</p>}
    {state.status === "unavailable" && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      <Image className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{state.message}</span>
      <Button type="button" variant="ghost" size="sm" onClick={retry}>Try again</Button>
    </div>}
    {state.status === "ready" && (onOpen
      ? <button type="button" className="block max-w-full cursor-zoom-in rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open ${name} in the file viewer`} onClick={open}>
        <img src={state.preview.dataUrl} width={state.preview.width} height={state.preview.height} alt={prompt ?? name} className={IMAGE_CLASS} />
      </button>
      : <img src={state.preview.dataUrl} width={state.preview.width} height={state.preview.height} alt={prompt ?? name} className={IMAGE_CLASS} />)}
    {state.status === "ready" && <figcaption className="line-clamp-2 text-xs text-muted-foreground" title={prompt ?? path}>{prompt ?? name}</figcaption>}
    {openError && <p role="alert" className="text-xs text-destructive">{openError}</p>}
  </figure>;
}

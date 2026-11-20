import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranscriptHistory } from "@/components/app/hooks/useTranscriptHistory";
import type { TranscriptHistoryProps } from "@/components/app/types/transcript-history/history.types";

export function TranscriptHistory({ scrollRef, onNavigate, children, className }: TranscriptHistoryProps) {
  const { prompts, visible } = useTranscriptHistory(scrollRef);
  const jump = (id: string) => {
    const scroller = scrollRef.current;
    const target = Array.from(scroller?.querySelectorAll<HTMLElement>("[data-history-prompt]") ?? [])
      .find((element) => element.dataset.historyPrompt === id);
    if (!scroller || !target) return;
    onNavigate();
    scroller.scrollTo({ top: target.getBoundingClientRect().top - scroller.getBoundingClientRect().top
      - scroller.clientTop + scroller.scrollTop - 24,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
    {children}
    {prompts.length > 1 && <nav aria-label="Prompt history" className="absolute left-1 top-1/2 z-10 max-h-[calc(100%_-_32px)] -translate-y-1/2 overflow-y-auto overscroll-contain rounded-md bg-background/90 py-1 scrollbar-none">
      {prompts.map((prompt, index) => {
        const active = visible.includes(prompt.id);
        return <Tooltip key={prompt.id} side="right" content={<div className="space-y-2">
            <p className="line-clamp-3 font-medium">{prompt.text}</p>
            {prompt.output && <p className="line-clamp-8 text-muted-foreground">{prompt.output}</p>}
          </div>}
          className="max-h-[min(24rem,70vh)] overflow-hidden">
          <button type="button" aria-label={`Jump to prompt ${index + 1}: ${prompt.text}`} aria-current={active ? "location" : undefined}
            className="group flex h-4 w-8 items-center justify-start rounded px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onClick={() => jump(prompt.id)}>
            <span aria-hidden="true" className={cn("h-0.5 rounded-full transition-[width,background-color] motion-reduce:transition-none group-hover:w-5 group-hover:bg-foreground",
              active ? "w-5 bg-primary" : "w-2.5 bg-muted-foreground/45")} />
          </button>
        </Tooltip>;
      })}
    </nav>}
  </div>;
}

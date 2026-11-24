import { ArrowUp, Check, Sparkles } from "lucide-react";
import type { AppWelcomePreviewProps } from "@/components/app/types/appStarters.types";
import { AppIcon } from "./AppIcon";

/** Milliseconds between each word of the prompt appearing, and the gaps that follow it in the build sequence. */
const WORD_MS = 55;
const REPLY_GAP_MS = 180;
const PANEL_GAP_MS = 420;
const PANEL_STAGGER_MS = 120;
const READY_GAP_MS = 760;

/** Delays for one playthrough: the prompt types in, Nora replies, the panels assemble, then the reply turns to ready. */
function previewTimeline(wordCount: number) {
  const typed = wordCount * WORD_MS;
  const panels = typed + PANEL_GAP_MS;
  return { reply: typed + REPLY_GAP_MS, panels, ready: panels + 3 * PANEL_STAGGER_MS + READY_GAP_MS };
}

const ms = (value: number): string => `${value}ms`;

/**
 * A small illustrative build, using sample data rather than the user's connected accounts. Radix mounts only the active
 * tab's content, so switching examples replays the sequence from the start.
 */
export function AppWelcomePreview({ example }: AppWelcomePreviewProps) {
  const { preview } = example;
  const words = preview.prompt.split(" ");
  const time = previewTimeline(words.length);
  const panelDelay = (index: number): string => ms(time.panels + index * PANEL_STAGGER_MS);
  return <div className="app-welcome-frame grid overflow-hidden rounded-2xl border border-border/80 bg-card/80">
    <div className="app-welcome-chat flex min-w-0 flex-col gap-3 p-4">
      <div className="flex flex-1 flex-col justify-center gap-3">
      <div className="ml-auto max-w-[17rem] rounded-2xl rounded-br-md bg-primary/10 px-3.5 py-2.5 text-[11.5px] leading-5">
        <span className="sr-only">{preview.prompt}</span>
        <span aria-hidden="true">{words.map((word, index) => <span key={index} className="app-welcome-word" style={{ animationDelay: ms(index * WORD_MS) }}>{word} </span>)}</span>
      </div>
      <div className="app-welcome-in flex items-start gap-2.5" style={{ animationDelay: ms(time.reply) }}>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles className="size-3" aria-hidden="true" /></span>
        <div className="min-w-0 text-[11.5px] leading-5">
          <p className="grid">
            <span className="app-welcome-building col-start-1 row-start-1 flex items-center gap-1.5 text-muted-foreground" style={{ animationDelay: `0ms, ${ms(time.ready - time.reply)}` }}>
              Building {example.label}<span className="app-welcome-dots" aria-hidden="true"><i /><i /><i /></span>
            </span>
            <span className="app-welcome-ready col-start-1 row-start-1 flex items-center gap-1.5" style={{ animationDelay: ms(time.ready - time.reply) }}>
              <Check className="size-3.5 text-primary" aria-hidden="true" />{example.label} is ready
            </span>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">Using
            {preview.sources.map((source) => <span key={source} className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5">{source}</span>)}
          </p>
        </div>
      </div>
      </div>
      <div className="app-welcome-in flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 py-1.5 pl-3 pr-1.5 text-[10.5px] text-muted-foreground" style={{ animationDelay: ms(time.ready + 200) }} aria-hidden="true">
        <span className="flex-1 truncate">Ask for a change…</span>
        <span className="flex size-6 items-center justify-center rounded-lg bg-muted"><ArrowUp className="size-3" /></span>
      </div>
    </div>
    <div className="app-welcome-app relative min-w-0 bg-background/70">
      <span className="app-welcome-sweep" style={{ animationDelay: ms(time.panels - 200) }} aria-hidden="true" />
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold"><AppIcon icon={example.icon} className="size-3.5 text-primary" />{example.label}</span>
        <span className="app-welcome-in flex shrink-0 items-center gap-1.5 text-[9px] text-muted-foreground" style={{ animationDelay: ms(time.ready) }}><span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />Live</span>
      </div>
      <div className="app-welcome-panels grid gap-2 p-3">
        {preview.metrics.map((metric, index) => <div key={metric.label} className="app-welcome-panel min-w-0 rounded-xl border border-border/70 bg-card px-3 py-2.5" style={{ animationDelay: panelDelay(index) }}>
          <p className="text-[9px] text-muted-foreground">{metric.label}</p>
          <p className="my-0.5 text-xl font-semibold tracking-tight tabular-nums">{metric.value}</p>
          <p className="app-welcome-metric-note truncate text-[9px] text-muted-foreground">{metric.note}</p>
        </div>)}
        <div className="app-welcome-panel min-w-0 rounded-xl border border-border/70 bg-card px-3 pb-2 pt-2.5" style={{ animationDelay: panelDelay(2) }}>
          <p className="text-[9px] font-medium">{preview.chartTitle}</p>
          <div className="app-welcome-chart mt-2 flex h-[4.25rem] items-end gap-1.5" aria-hidden="true">
            {preview.bars.map((height, index) => <span key={index} className="app-welcome-bar flex-1 rounded-t-[3px] bg-primary/30 last:bg-primary" style={{ height: `${height}%`, animationDelay: ms(time.panels + 2 * PANEL_STAGGER_MS + 120 + index * 50) }} />)}
          </div>
        </div>
        <div className="app-welcome-panel min-w-0 rounded-xl border border-border/70 bg-card px-3 pt-2.5" style={{ animationDelay: panelDelay(3) }}>
          <p className="text-[9px] font-medium">{preview.listTitle}</p>
          {preview.rows.map((row, index) => <div key={row.title} className="app-welcome-in flex min-w-0 items-center gap-2 border-b border-border/50 py-1 last:border-0" style={{ animationDelay: ms(time.panels + 3 * PANEL_STAGGER_MS + 160 + index * 80) }}>
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground" aria-hidden="true">{row.title.charAt(0)}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-[9.5px] font-medium">{row.title}</p><p className="truncate text-[8.5px] text-muted-foreground">{row.detail}</p></div>
            <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">{row.value}</span>
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}

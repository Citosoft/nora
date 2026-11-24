import { useMemo } from "react";
import { formatTokens, tallyContextRequest } from "@/components/app/logic/contextTokens";
import { ChatContextSection } from "./ChatContextSection";
import type { ChatContextRequestCardProps } from "@/components/app/types/chatContext.types";

/** One model request the next message makes: what it is for, its model, its parts and how many tokens they come to. */
export function ChatContextRequestCard({ request }: ChatContextRequestCardProps) {
  const tally = useMemo(() => tallyContextRequest(request), [request]);
  const last = request.lastRequest;
  return <section aria-label={request.title} className="rounded-lg border">
    <header className="space-y-1 border-b px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[12px] font-semibold">{request.title}</h3>
        <span className="font-mono tabular-nums" title={tally.measured ? "Measured occupancy of this thread plus this turn's new text" : "Estimated from the visible text"}>
          {tally.measured ? "" : "≈"}{formatTokens(tally.next)}{tally.window ? ` / ${formatTokens(tally.window)}` : ""} tokens</span>
      </div>
      <p className="truncate font-mono text-[10px] text-muted-foreground" title={request.model}>{request.model}</p>
      <p className="text-[10px] leading-snug text-muted-foreground">{request.purpose}</p>
    </header>
    <div className="space-y-0.5 p-1">{tally.sections.map((entry) => <ChatContextSection key={entry.section.id} tally={entry} />)}</div>
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t px-3 py-2 text-[10px]">
      <dt className="text-muted-foreground">Visible system</dt><dd className="text-right tabular-nums">≈{formatTokens(tally.system)}</dd>
      <dt className="text-muted-foreground">This turn</dt><dd className="text-right tabular-nums">≈{formatTokens(tally.turn)}</dd>
      {last && <>
        <dt className="col-span-2 mt-1 font-medium">Last request in this thread (measured)</dt>
        <dt className="text-muted-foreground">Input</dt><dd className="text-right tabular-nums">{last.inputTokens.toLocaleString()}</dd>
        <dt className="text-muted-foreground">Cached input</dt><dd className="text-right tabular-nums">{last.cachedInputTokens.toLocaleString()}</dd>
        {last.cacheCreationInputTokens !== undefined && <><dt className="text-muted-foreground">Cache writes</dt>
          <dd className="text-right tabular-nums">{last.cacheCreationInputTokens.toLocaleString()}</dd></>}
        <dt className="text-muted-foreground">Output</dt><dd className="text-right tabular-nums">{last.outputTokens.toLocaleString()}</dd>
        <dt className="text-muted-foreground">Context used</dt>
        <dd className="text-right tabular-nums">{last.usedTokens.toLocaleString()} / {last.windowTokens.toLocaleString()}</dd>
      </>}
    </dl>
  </section>;
}

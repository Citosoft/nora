import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ChatContextRequestCard } from "./ChatContextRequestCard";
import type { DirectContextTarget } from "@shared/ipc/types/directContextGateway.types";
import type { ChatContextPanelProps } from "@/components/app/types/chatContext.types";

const AUTO = "auto";
const targetValue = (target: DirectContextTarget): string => target.kind === "continue" ? `continue:${target.threadId}` : `new:${target.workspaceId}`;

/**
 * Developer view beside a direct chat: every model request the next message would make, part by part with token estimates,
 * built from the composer draft. The router chooses the work thread at send time, so the target can be switched here.
 */
export function ChatContextPanel({ state, target, onTargetChange, onRefresh, onClose }: ChatContextPanelProps) {
  const preview = state.preview;
  const options = preview?.targets ?? [];
  const select = (value: string) => onTargetChange(value === AUTO ? null : options.find((option) => targetValue(option.target) === value)?.target ?? null);
  const fallbackLabel = preview ? options.find((option) => targetValue(option.target) === targetValue(preview.target))?.label : null;
  return <aside aria-label="Next request context" className="flex w-[420px] shrink-0 flex-col border-l text-xs">
    <header className="flex items-center gap-1 border-b px-3 py-2">
      <h2 className="flex-1 text-[13px] font-semibold">Next request context</h2>
      <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Refresh context" title="Refresh" onClick={onRefresh}>
        <RefreshCw className={`size-3.5 ${state.status === "loading" ? "animate-spin" : ""}`} aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Close context panel" title="Close" onClick={onClose}>
        <X className="size-3.5" aria-hidden="true" /></Button>
    </header>
    <div className="thin-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      <p className="text-[11px] leading-snug text-muted-foreground">Built from your draft as if you sent it now. Counts marked ≈ are estimates (about 4 characters a token).</p>
      {options.length > 0 && <label className="block space-y-1">
        <span className="font-medium">Work thread</span>
        <Select aria-label="Work thread to preview" value={target ? targetValue(target) : AUTO} onChange={(event) => select(event.target.value)}>
          <option value={AUTO}>{`Router fallback${fallbackLabel && !target ? `: ${fallbackLabel}` : ""}`}</option>
          {options.map((option) => <option key={targetValue(option.target)} value={targetValue(option.target)}>{option.label}</option>)}
        </Select>
      </label>}
      {state.status === "failed" && <p role="alert" className="text-destructive">{state.message}</p>}
      {!preview && state.status === "loading" && <p className="text-muted-foreground" role="status">Reading context…</p>}
      {preview?.requests.map((request) => <ChatContextRequestCard key={request.id} request={request} />)}
    </div>
  </aside>;
}

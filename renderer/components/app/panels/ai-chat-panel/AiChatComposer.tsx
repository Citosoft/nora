import type { AiChatComposerProps } from "@/components/app/types/aiChatComposer.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowUp, FolderOpen } from "lucide-react";
import { useCallback, useEffect } from "react";
import { AiChatModeSelect } from "./AiChatModeSelect";
import { AiChatProviderModelSelect } from "./AiChatProviderModelSelect";
import { AiChatReasoningLevelSelect } from "./AiChatReasoningLevelSelect";

export const AiChatComposer = ({
  textareaRef,
  draft,
  onDraftChange,
  onSubmit,
  showConfigureAiSettingsShortcut,
  showModelBar,
  onOpenAiSettings,
  aiSettings,
  aiModelOptions,
  aiModelLoading,
  onSelectAiChatProviderModel,
  workspacePill,
  chatMode,
  onChatModeChange,
  provider,
  effectiveReasoningMode,
  supportedReasoningLevels,
  onReasoningModeChange,
  hasTransport,
  busy,
  canSend
}: AiChatComposerProps) => {
  const adjustComposerHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    const maxPx = 200;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`;
  }, [textareaRef]);

  useEffect(() => {
    adjustComposerHeight();
  }, [draft, adjustComposerHeight]);

  return (
    <div className="px-3 pb-4 pt-2 sm:px-4">
      {provider ? (
        <p className="mb-1.5 px-1 text-[11px] text-muted-foreground/80">Enter to send · Shift+Enter for a new line</p>
      ) : null}
      <div className="relative overflow-hidden rounded-[22px] border border-border/70 bg-muted/35 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] dark:bg-muted/25 dark:ring-white/[0.06]">
        {showConfigureAiSettingsShortcut ? (
          <div className="border-b border-border/45 px-3 py-1.5 text-[11px] text-muted-foreground">
            No API keys configured.{" "}
            <button
              type="button"
              className="font-medium text-foreground underline decoration-foreground/50 underline-offset-2 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
              onClick={onOpenAiSettings}
            >
              Open Settings → AI
            </button>
          </div>
        ) : null}
        {showModelBar ? (
          <div className="border-b border-border/45 px-1.5 py-0.5">
            <AiChatProviderModelSelect
              aiSettings={aiSettings}
              aiModelOptions={aiModelOptions}
              aiModelLoading={aiModelLoading}
              disabled={busy}
              onSelect={onSelectAiChatProviderModel}
            />
          </div>
        ) : null}
        <div className={cn("flex items-center gap-2 px-3 pb-1", showModelBar ? "pt-2" : "pt-2.5")}>
          <div className="min-w-0 flex-1">
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/60 bg-background/85 px-2.5 py-0.5 text-[11px] font-medium text-foreground/90 shadow-sm backdrop-blur-sm"
              title={workspacePill.title}
              role="status"
              aria-label={`Active workspace: ${workspacePill.label}. ${workspacePill.title}`}
            >
              <FolderOpen className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 truncate">{workspacePill.label}</span>
            </span>
          </div>
          <AiChatModeSelect value={chatMode} disabled={busy} onChange={onChatModeChange} />
          {provider ? (
            <AiChatReasoningLevelSelect
              value={effectiveReasoningMode}
              supportedLevels={supportedReasoningLevels}
              disabled={busy}
              onChange={onReasoningModeChange}
            />
          ) : null}
        </div>
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
              return;
            }
            event.preventDefault();
            onSubmit();
          }}
          placeholder={
            provider ? "Message the workspace assistant…" : "Add an API key in Settings → AI to start chatting"
          }
          disabled={!hasTransport || busy}
          rows={1}
          aria-label="Message input"
          className="max-h-[200px] min-h-[44px] w-full resize-none rounded-none rounded-b-[20px] border-0 bg-transparent px-3 pb-10 pr-14 pt-0 text-[15px] leading-[1.45] shadow-none placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed"
        />
        <div className="pointer-events-none absolute bottom-2 right-2">
          <Button
            type="button"
            size="icon"
            variant="default"
            aria-label="Send message"
            disabled={!canSend}
            onClick={onSubmit}
            className="pointer-events-auto size-9 rounded-full shadow-sm"
          >
            <ArrowUp className="size-[18px]" strokeWidth={2.25} />
          </Button>
        </div>
      </div>
    </div>
  );
};

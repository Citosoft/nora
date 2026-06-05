import { VoiceInputLevelTracker } from "@/components/app/panels/focused-agent/VoiceInputLevelTracker";
import { countSelectedAgentContextGroups } from "@/components/app/logic/agentContextSelections";
import { AgentContextPicker } from "@/components/app/shared/AgentContextPicker";
import { getPastedImageLabel, getWorkspacePathPillLabel } from "@/components/app/logic/agentInputAttachments";
import type { FocusedAgentInputComposerProps } from "@/components/app/types/focusedAgentSessionChrome.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ArrowUp, FileImage, FileText, Folder, LoaderCircle, Mic, Share2, Square, X } from "lucide-react";

export const FocusedAgentInputComposer = ({
  agent,
  pastedImages,
  attachedWorkspacePaths,
  contextSelector,
  isLoadingContextSources,
  isVoiceTranscriptionReady,
  isVoiceInputSupported,
  isListeningVoiceInput,
  isTranscribingVoiceInput,
  voiceInputLevels,
  isSendingTerminalInput,
  isSavingPastedImage,
  canSendLiveTerminalInput,
  onRemovePastedImage,
  onRemoveAttachedPath,
  onOpenImagePreview,
  onChangeContextSelections,
  onDragOver,
  onDrop,
  onPaste,
  onSend,
  onToggleVoiceInput,
  inputRef
}: FocusedAgentInputComposerProps) => {
  const selectedContextCount = countSelectedAgentContextGroups(contextSelector.sources, contextSelector.selections);

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-transparent bg-transparent p-1.5 shadow-none ring-0">
      <div className="space-y-1.5">
        {(agent && pastedImages.length > 0) || attachedWorkspacePaths.length > 0 || selectedContextCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {agent && pastedImages.length > 0
            ? pastedImages.map((draft, index) => (
                <div
                  key={draft.id}
                  className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-border/60 bg-muted/70 px-3 text-xs text-foreground"
                >
                  <button
                    type="button"
                    className="inline-flex min-w-0 items-center gap-2 rounded-full text-left transition hover:text-primary"
                    onClick={() => onOpenImagePreview(draft)}
                    title={draft.path}
                    aria-label={`Open ${getPastedImageLabel(draft, index)}`}
                  >
                    <FileImage className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate">{getPastedImageLabel(draft, index)}</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background/80 hover:text-foreground"
                    onClick={() => onRemovePastedImage(draft.id)}
                    aria-label={`Remove ${getPastedImageLabel(draft, index)}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))
            : null}
          {attachedWorkspacePaths.map((draft) => (
            <div
              key={draft.id}
              className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-border/60 bg-muted/70 px-3 text-xs text-foreground"
            >
              <span className="inline-flex min-w-0 items-center gap-2 rounded-full text-left" title={draft.path}>
                {draft.kind === "directory" ? (
                  <Folder className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <FileText className="size-3.5 shrink-0 text-primary" />
                )}
                <span className="truncate">{getWorkspacePathPillLabel(draft)}</span>
              </span>
              <button
                type="button"
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background/80 hover:text-foreground"
                onClick={() => onRemoveAttachedPath(draft.id)}
                aria-label={`Remove ${getWorkspacePathPillLabel(draft)}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {agent && selectedContextCount > 0 ? (
            <div className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs text-foreground">
              <Share2 className="size-3.5 shrink-0 text-primary" />
              <span>{selectedContextCount} context session{selectedContextCount === 1 ? "" : "s"} selected</span>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center gap-1 rounded-[18px] border border-slate-400/80 bg-background/25 px-2.5 py-1.5 dark:border-border/45">
        {agent ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                tooltip="Share agent context"
                className="size-8 shrink-0 rounded-full"
                disabled={isLoadingContextSources || (contextSelector.sources.length === 0 && selectedContextCount === 0)}
                aria-label="Share agent context"
              >
                {isLoadingContextSources ? <LoaderCircle className="size-4 animate-spin" /> : <Share2 className="size-4" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(42rem,calc(100vw-2rem))] p-0">
              <AgentContextPicker
                sources={contextSelector.sources}
                selections={contextSelector.selections}
                isLoading={isLoadingContextSources}
                emptyMessage="No other agents in this workspace have tracked context yet."
                onChange={onChangeContextSelections}
              />
            </PopoverContent>
          </Popover>
        ) : null}
        {isListeningVoiceInput ? (
          <VoiceInputLevelTracker levels={voiceInputLevels} />
        ) : (
          <Input
            ref={inputRef}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onPaste={(event) => {
              void onPaste(event);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSend();
              }
            }}
            placeholder={agent ? "Send input to agent" : "Send input to terminal"}
            disabled={isSendingTerminalInput || isSavingPastedImage || !canSendLiveTerminalInput}
            className="h-8 min-w-0 flex-1 border-0 bg-transparent px-2 text-[15px] shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          tooltip={
            !isVoiceTranscriptionReady
              ? "Configure voice dictation in Settings -> Voice to enable voice input"
              : !isVoiceInputSupported
              ? "Voice input is not supported in this environment"
              : isTranscribingVoiceInput
                ? "Transcribing voice input"
              : isListeningVoiceInput
                ? "Listening — click to stop and transcribe"
                : "Start voice input"
          }
          className={cn(
            "size-8 shrink-0 rounded-full",
            isListeningVoiceInput && "bg-primary/15 text-primary hover:bg-primary/20",
            isTranscribingVoiceInput && "bg-primary/10 text-primary hover:bg-primary/15"
          )}
          disabled={
            !isVoiceTranscriptionReady ||
            !isVoiceInputSupported ||
            isSendingTerminalInput ||
            isSavingPastedImage ||
            isTranscribingVoiceInput ||
            !canSendLiveTerminalInput
          }
          aria-label={
            isTranscribingVoiceInput
              ? "Transcribing voice input"
              : isListeningVoiceInput
                ? "Stop voice input"
                : "Start voice input"
          }
          aria-pressed={isListeningVoiceInput}
          onClick={onToggleVoiceInput}
        >
          {isTranscribingVoiceInput ? (
            <LoaderCircle className="size-[16px] animate-spin" />
          ) : isListeningVoiceInput ? (
            <Square className="size-[14px] fill-current" aria-hidden />
          ) : (
            <Mic className="size-[16px]" aria-hidden />
          )}
        </Button>
        <Button
          variant="default"
          size="icon"
          tooltip="Send terminal input"
          className="size-8 shrink-0 rounded-full shadow-sm"
          onClick={() => void onSend()}
          disabled={isSendingTerminalInput || isSavingPastedImage || !canSendLiveTerminalInput}
          aria-label="Send terminal input"
        >
          <ArrowUp className="size-[16px]" strokeWidth={2.25} />
        </Button>
      </div>
      </div>
    </div>
  );
};

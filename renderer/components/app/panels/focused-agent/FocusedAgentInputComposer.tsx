import { countSelectedAgentContextGroups } from "@/components/app/logic/agentContextSelections";
import { AgentContextPicker } from "@/components/app/shared/AgentContextPicker";
import { getPastedImageLabel, getWorkspacePathPillLabel } from "@/components/app/logic/agentInputAttachments";
import type { FocusedAgentInputComposerProps } from "@/components/app/types/focusedAgentSessionChrome.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileImage, FileText, Folder, LoaderCircle, Send, Share2, X } from "lucide-react";

export const FocusedAgentInputComposer = ({
  agent,
  pastedImages,
  attachedWorkspacePaths,
  contextSelector,
  isLoadingContextSources,
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
  inputRef
}: FocusedAgentInputComposerProps) => {
  const selectedContextCount = countSelectedAgentContextGroups(contextSelector.sources, contextSelector.selections);

  return (
    <div className="relative -top-[16px] mb-[-16px] bg-card/95 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="space-y-2">
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
      <div className="flex items-center gap-2">
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
          className="h-9 rounded-[4px] border border-border/40 bg-transparent px-2 shadow-none"
        />
        {agent ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                tooltip="Share agent context"
                className="h-9 rounded-[4px] border border-border/40 bg-transparent px-2.5 hover:bg-transparent"
                disabled={isLoadingContextSources || (contextSelector.sources.length === 0 && selectedContextCount === 0)}
                aria-label="Share agent context"
              >
                {isLoadingContextSources ? <LoaderCircle className="size-4 animate-spin" /> : <Share2 className="size-4" />}
                {selectedContextCount > 0 ? (
                  <span className="ml-1 text-xs text-muted-foreground">{selectedContextCount}</span>
                ) : null}
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
        <Button
          variant="outline"
          size="sm"
          tooltip="Send terminal input"
          className="h-9 rounded-[4px] border border-border/40 bg-transparent px-2.5 hover:bg-transparent"
          onClick={() => void onSend()}
          disabled={isSendingTerminalInput || isSavingPastedImage || !canSendLiveTerminalInput}
          aria-label="Send terminal input"
        >
          <Send className="size-4" />
        </Button>
      </div>
      </div>
    </div>
  );
};

import { getPastedImageLabel, getWorkspacePathPillLabel } from "@/components/app/logic/agentInputAttachments";
import type { FocusedAgentInputComposerProps } from "@/components/app/types/focusedAgentSessionChrome.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { FileImage, FileText, Folder, LoaderCircle, Send, X } from "lucide-react";

export const FocusedAgentInputComposer = ({
  agent,
  pastedImages,
  attachedWorkspacePaths,
  injectableContexts,
  isLoadingInjectableContexts,
  isSendingTerminalInput,
  isSavingPastedImage,
  canSendLiveTerminalInput,
  onRemovePastedImage,
  onRemoveAttachedPath,
  onOpenImagePreview,
  onInjectContext,
  onDragOver,
  onDrop,
  onPaste,
  onSend,
  inputRef
}: FocusedAgentInputComposerProps) => (
  <div className="relative -top-[16px] mb-[-16px] bg-card/95 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
    <div className="space-y-2">
      {(agent && pastedImages.length > 0) || attachedWorkspacePaths.length > 0 ? (
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
          <DropdownMenu
            align="end"
            trigger={(
              <Button
                variant="outline"
                size="sm"
                tooltip="Inject context from another agent"
                className="h-9 rounded-[4px] border border-border/40 bg-transparent px-2.5 hover:bg-transparent"
                disabled={isLoadingInjectableContexts || !injectableContexts.length}
                aria-label="Inject context"
              >
                {isLoadingInjectableContexts ? <LoaderCircle className="size-4 animate-spin" /> : <FileText className="size-4" />}
              </Button>
            )}
          >
            {injectableContexts.length ? (
              injectableContexts.map((context) => (
                <DropdownMenuItem
                  key={context.agentId}
                  onSelect={() => {
                    onInjectContext(context);
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm">{context.agentName}</div>
                    <div className="truncate text-xs text-muted-foreground">{context.preview.slice(0, 72)}</div>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem onSelect={() => {}}>
                <span className="text-xs text-muted-foreground">No context from other agents yet</span>
              </DropdownMenuItem>
            )}
          </DropdownMenu>
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

import { ImagePreviewDialog } from "@/components/app/dialogs/ImagePreviewDialog";
import { useFocusedAgentPanelSession } from "@/components/app/hooks/useFocusedAgentPanelSession";
import { getPastedImageLabel } from "@/components/app/logic/agentInputAttachments";
import { resolveTerminalTheme } from "@/components/app/logic/terminalPresentation";
import { AgentContextCard } from "@/components/app/panels/AgentContextCard";
import { FocusedAgentInputComposer } from "@/components/app/panels/focused-agent/FocusedAgentInputComposer";
import { FocusedAgentNoSessionView } from "@/components/app/panels/focused-agent/FocusedAgentNoSessionView";
import { FocusedAgentSessionDetailsPopover } from "@/components/app/panels/focused-agent/FocusedAgentSessionDetailsPopover";
import { FocusedAgentSessionToolbar } from "@/components/app/panels/focused-agent/FocusedAgentSessionToolbar";
import { FocusedAgentWorktreePreparingBanner } from "@/components/app/panels/focused-agent/FocusedAgentWorktreePreparingBanner";
import { LiveTerminal } from "@/components/app/panels/focused-agent/LiveTerminal";
import type { FocusedAgentPanelProps } from "@/components/app/types/component.types";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog";
import { memo, useMemo } from "react";

function FocusedAgentPanelComponent({ agent, terminal, compact = false }: FocusedAgentPanelProps) {
  const s = useFocusedAgentPanelSession({ agent, terminal });
  const terminalOverlayBackground = useMemo(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    return resolveTerminalTheme(s.terminalThemeId, s.resolvedTheme, rootStyles).background || "";
  }, [s.resolvedTheme, s.terminalThemeId]);

  if (!agent && !terminal) {
    return (
      <FocusedAgentNoSessionView
        project={s.project}
        workspace={s.workspace}
        platform={s.platform}
        addWorkspaceShortcutParts={s.addWorkspaceShortcutParts}
        onChooseProject={() => void s.onChooseProject()}
        workspaceHome={s.noSessionWorkspaceHome}
      />
    );
  }

  return (
    <Card className="center-column-surface h-full min-h-0 rounded-none border-x-0 border-t-0 bg-card/95">
      <CardContent className="grid h-full grid-rows-[minmax(0,1fr)] p-0">
        <div className="grid min-h-0">
          {agent ? (
            <Dialog open={s.showContext} onOpenChange={s.setShowContext}>
              <DialogContent
                onClose={() => s.setShowContext(false)}
                className="h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-h-none max-w-none"
              >
                <DialogBody className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-0">
                  <AgentContextCard
                    layout="modal"
                    state={s.contextState}
                    loading={s.contextStatus === "loading"}
                    clearing={s.isClearingContext}
                    onClear={() => void s.handleClearContext()}
                    onCopyReference={(value) => void s.handleCopyContextReference(value)}
                    onClose={() => s.setShowContext(false)}
                  />
                </DialogBody>
              </DialogContent>
            </Dialog>
          ) : null}
          <div className="relative flex min-h-0 flex-col bg-card/95">
            <FocusedAgentSessionToolbar
              compact={compact}
              agent={agent}
              terminal={terminal}
              focusedSession={s.focusedSession}
              onToggleSessionInfo={() => s.setShowInfo((current) => !current)}
              onToggleContext={() => s.setShowContext((current) => !current)}
              onClearTerminal={s.handleClearTerminal}
              onRestart={s.handleRestart}
              onDestroy={() => {
                if (agent) {
                  s.onDestroyRequest(agent.id);
                  return;
                }
                if (terminal) {
                  void s.onDestroyTerminal(terminal.id);
                }
              }}
            />
            {s.showInfo ? (
              <FocusedAgentSessionDetailsPopover
                infoPopoverRef={s.infoPopoverRef}
                agent={agent}
                terminal={terminal}
              />
            ) : null}
            {s.isPreparingWorktree ? <FocusedAgentWorktreePreparingBanner /> : null}
            <div className="relative min-h-0 flex-1">
              <div className="flex h-full min-h-0 flex-col pb-32" style={{ backgroundColor: terminalOverlayBackground }}>
                {s.activeSessionId ? (
                  <LiveTerminal
                    key={`${s.activeSessionId}:${s.terminalResetVersion}`}
                    sessionId={s.activeSessionId}
                    resetVersion={s.terminalResetVersion}
                    submission={s.terminalSubmission}
                    canSendInput={s.canSendLiveTerminalInput}
                    workspaceRootForPathDrop={s.sessionWorkspaceAbsoluteRoot}
                    resolvedTheme={s.resolvedTheme}
                    terminalThemeId={s.terminalThemeId}
                    terminalFontId={s.terminalFontId}
                    getTaskDropText={s.buildTaskInstructionText}
                  />
                ) : null}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-6 pb-4 sm:px-8 md:px-10">
                <div
                  className="pointer-events-auto mx-auto w-full max-w-3xl rounded-2xl"
                  style={{ backgroundColor: terminalOverlayBackground }}
                >
                  <FocusedAgentInputComposer
                    agent={agent}
                    pastedImages={s.pastedImages}
                    attachedWorkspacePaths={s.attachedWorkspacePaths}
                    contextSelector={s.contextSelector}
                    isLoadingContextSources={s.isLoadingContextSources}
                    hasVoiceTranscriptionApiKey={s.hasVoiceTranscriptionApiKey}
                    isVoiceInputSupported={s.isVoiceInputSupported}
                    isListeningVoiceInput={s.isListeningVoiceInput}
                    isSendingTerminalInput={s.isSendingTerminalInput}
                    isSavingPastedImage={s.isSavingPastedImage}
                    canSendLiveTerminalInput={s.canSendLiveTerminalInput}
                    onRemovePastedImage={s.handleRemovePastedImage}
                    onRemoveAttachedPath={s.handleRemoveAttachedWorkspacePath}
                    onOpenImagePreview={s.setPreviewImageDraft}
                    onChangeContextSelections={s.handleChangeContextSelections}
                    onDragOver={s.handleAgentInputDragOver}
                    onDrop={s.handleAgentInputDrop}
                    onPaste={s.handleAgentInputPaste}
                    onSend={s.handleSendTerminalInput}
                    onToggleVoiceInput={s.handleToggleVoiceInput}
                    inputRef={s.terminalInputRef}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <ImagePreviewDialog
          open={s.previewImageDraft !== null}
          title={s.previewImageDraft ? getPastedImageLabel(s.previewImageDraft, 0) : "Image preview"}
          imageSrc={s.previewImageDraft?.dataUrl ?? null}
          onOpenChange={(open) => {
            if (!open) {
              s.setPreviewImageDraft(null);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

export const FocusedAgentPanel = memo(FocusedAgentPanelComponent);

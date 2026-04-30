import { ImagePreviewDialog } from "@/components/app/dialogs/ImagePreviewDialog";
import { useFocusedAgentPanelSession } from "@/components/app/hooks/useFocusedAgentPanelSession";
import { getPastedImageLabel } from "@/components/app/logic/agentInputAttachments";
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
import { memo } from "react";

function FocusedAgentPanelComponent({ agent, terminal, compact = false }: FocusedAgentPanelProps) {
  const s = useFocusedAgentPanelSession({ agent, terminal });

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
            <FocusedAgentInputComposer
              agent={agent}
              pastedImages={s.pastedImages}
              attachedWorkspacePaths={s.attachedWorkspacePaths}
              contextSelector={s.contextSelector}
              isLoadingContextSources={s.isLoadingContextSources}
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
              inputRef={s.terminalInputRef}
            />
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

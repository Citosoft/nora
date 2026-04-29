import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import { useTerminalSession } from "@/components/app/hooks/useTerminalSession";
import { getAbsolutePathStringsForTerminalDrop, quotePathForShellInsertion } from "@/components/app/logic/terminalDropPaths";
import { dataTransferDeclaresPathOrFileDrop } from "@/components/app/logic/workspacePathDrag";
import { dataTransferDeclaresTaskDrop, readWorkspaceTaskFromDataTransfer } from "@/components/app/logic/workspaceTaskDrag";
import type { LiveTerminalProps } from "@/components/app/types/focusedAgentPanelParts.types";
import { type DragEvent as ReactDragEvent } from "react";

export const LiveTerminal = ({
  sessionId,
  resetVersion,
  submission,
  canSendInput,
  workspaceRootForPathDrop,
  resolvedTheme,
  terminalThemeId,
  terminalFontId,
  getTaskDropText
}: LiveTerminalProps) => {
  const {
    containerRef,
    viewportRef,
    terminalRef,
    terminalThemeBackground
  } = useTerminalSession({
    sessionId,
    resetVersion,
    focusVersion: 0,
    submission,
    canSendInput,
    resolvedTheme,
    terminalThemeId,
    terminalFontId,
    submitEnterMode: "window-enter"
  });

  const handleTerminalPaneDragOverCapture = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!canSendInput) {
      return;
    }
    const dt = event.dataTransfer;
    if (!dataTransferDeclaresPathOrFileDrop(dt) && !dataTransferDeclaresTaskDrop(dt)) {
      return;
    }
    event.preventDefault();
    dt.dropEffect = "copy";
  };

  const handleTerminalPaneDragEnterCapture = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!canSendInput) {
      return;
    }
    const dt = event.dataTransfer;
    if (!dataTransferDeclaresPathOrFileDrop(dt) && !dataTransferDeclaresTaskDrop(dt)) {
      return;
    }
    event.preventDefault();
    dt.dropEffect = "copy";
  };

  const handleTerminalPaneDropCapture = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!canSendInput) {
      return;
    }
    const taskReference = readWorkspaceTaskFromDataTransfer(event.dataTransfer);
    if (taskReference) {
      event.preventDefault();
      event.stopPropagation();
      void noraTerminalClient.sendTerminalInput(sessionId, getTaskDropText(taskReference));
      requestAnimationFrame(() => {
        terminalRef.current?.focus();
        terminalRef.current?.textarea?.focus();
      });
      return;
    }
    const paths = getAbsolutePathStringsForTerminalDrop(event.dataTransfer, workspaceRootForPathDrop);
    if (paths.length === 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const text = paths.map(quotePathForShellInsertion).join(" ");
    void noraTerminalClient.sendTerminalInput(sessionId, text);
    requestAnimationFrame(() => {
      terminalRef.current?.focus();
      terminalRef.current?.textarea?.focus();
    });
  };

  return (
    <div
      ref={containerRef}
      className="min-h-0 min-w-0 w-full flex-1 overflow-hidden bg-background"
      onDragEnterCapture={handleTerminalPaneDragEnterCapture}
      onDragOverCapture={handleTerminalPaneDragOverCapture}
      onDropCapture={handleTerminalPaneDropCapture}
    >
      <div className="h-full w-full overflow-hidden p-3" style={{ backgroundColor: terminalThemeBackground }}>
        <div ref={viewportRef} className="h-full w-full overflow-hidden" />
      </div>
    </div>
  );
};

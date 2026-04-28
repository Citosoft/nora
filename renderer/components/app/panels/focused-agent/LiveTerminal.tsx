import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import { getAbsolutePathStringsForTerminalDrop, quotePathForShellInsertion } from "@/components/app/logic/terminalDropPaths";
import { getTerminalFontFamily, normalizeBufferedTerminalOutput, resolveTerminalTheme } from "@/components/app/logic/terminalPresentation";
import { getCachedTerminalViewportSize, setCachedTerminalViewportSize } from "@/components/app/logic/terminalViewportSizeCache";
import { dataTransferDeclaresPathOrFileDrop } from "@/components/app/logic/workspacePathDrag";
import { dataTransferDeclaresTaskDrop, readWorkspaceTaskFromDataTransfer } from "@/components/app/logic/workspaceTaskDrag";
import type { LiveTerminalProps } from "@/components/app/types/focusedAgentPanelParts.types";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useMemo, useRef, type DragEvent as ReactDragEvent } from "react";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastSizeRef = useRef<{ cols: number; rows: number }>({ cols: 0, rows: 0 });
  const lastSubmissionNonceRef = useRef<number | null>(null);
  const terminalTheme = useMemo(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    return resolveTerminalTheme(terminalThemeId, resolvedTheme, rootStyles);
  }, [resolvedTheme, terminalThemeId]);
  const fontFamily = useMemo(() => getTerminalFontFamily(terminalFontId), [terminalFontId]);

  useEffect(() => {
    if (!containerRef.current || !viewportRef.current || terminalRef.current) {
      return;
    }

    lastSizeRef.current = getCachedTerminalViewportSize(sessionId) ?? { cols: 0, rows: 0 };

    const terminal = new Terminal({
      cols: 120,
      convertEol: false,
      cursorBlink: true,
      disableStdin: false,
      fontFamily,
      fontSize: 12,
      lineHeight: 1.45,
      rows: 36,
      scrollback: 5000,
      theme: terminalTheme
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(viewportRef.current);

    const xtermRoot = viewportRef.current.querySelector(".xterm");
    const helperTextarea = xtermRoot?.querySelector(".xterm-helper-textarea") as HTMLTextAreaElement | null;
    const charMeasure = xtermRoot?.querySelector(".xterm-char-measure-element") as HTMLElement | null;
    const helpers = xtermRoot?.querySelector(".xterm-helpers") as HTMLElement | null;

    if (helpers) {
      helpers.style.position = "absolute";
      helpers.style.left = "-9999px";
      helpers.style.top = "-9999px";
      helpers.style.opacity = "0";
      helpers.style.pointerEvents = "none";
    }

    if (helperTextarea) {
      helperTextarea.style.position = "absolute";
      helperTextarea.style.left = "-9999px";
      helperTextarea.style.top = "-9999px";
      helperTextarea.style.width = "0";
      helperTextarea.style.height = "0";
      helperTextarea.style.opacity = "0";
      helperTextarea.style.border = "0";
      helperTextarea.style.background = "transparent";
      helperTextarea.style.color = "transparent";
      helperTextarea.style.pointerEvents = "none";
    }

    if (charMeasure) {
      charMeasure.style.position = "absolute";
      charMeasure.style.left = "-9999px";
      charMeasure.style.top = "-9999px";
      charMeasure.style.visibility = "hidden";
      charMeasure.style.opacity = "0";
      charMeasure.style.pointerEvents = "none";
    }

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.attachCustomKeyEventHandler((event) => {
      const isCopy = event.type === "keydown" && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "c";
      const isPaste = event.type === "keydown" && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "v";

      if (isCopy) {
        const selection = terminal.getSelection();
        if (selection) {
          void navigator.clipboard.writeText(selection);
        }
        return false;
      }

      if (isPaste) {
        void navigator.clipboard
          .readText()
          .then((text) => {
            if (text && canSendInput) {
              void noraTerminalClient.sendTerminalInput(sessionId, text);
            }
          })
          .catch(() => {
            // ignore clipboard read failures
          });
        return false;
      }

      return true;
    });

    terminal.onData((data) => {
      if (!canSendInput) {
        return;
      }
      void noraTerminalClient.sendTerminalInput(sessionId, data);
    });

    requestAnimationFrame(() => {
      terminal.focus();
      terminal.textarea?.focus();
    });

    const applySize = () => {
      const fit = fitAddonRef.current;
      const currentTerminal = terminalRef.current;
      if (!fit || !currentTerminal) {
        return;
      }

      fit.fit();

      if (currentTerminal.cols !== lastSizeRef.current.cols || currentTerminal.rows !== lastSizeRef.current.rows) {
        lastSizeRef.current = {
          cols: currentTerminal.cols,
          rows: currentTerminal.rows
        };
        setCachedTerminalViewportSize(sessionId, lastSizeRef.current);
        void noraTerminalClient.resizeTerminal(sessionId, currentTerminal.cols, currentTerminal.rows);
      }
    };

    applySize();

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(applySize);
    });
    resizeObserver.observe(containerRef.current);

    const unsubscribe = noraTerminalClient.onTerminalData((payload) => {
      if (payload.sessionId !== sessionId || !terminalRef.current) {
        return;
      }
      terminalRef.current.write(payload.data);
    });

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, terminalTheme, fontFamily, canSendInput]);

  useEffect(() => {
    let cancelled = false;

    void noraTerminalClient.getTerminalBuffer(sessionId).then((buffer) => {
      if (cancelled || !terminalRef.current) {
        return;
      }
      terminalRef.current.reset();
      terminalRef.current.write(normalizeBufferedTerminalOutput(buffer));
      requestAnimationFrame(() => {
        terminalRef.current?.focus();
        terminalRef.current?.textarea?.focus();
      });
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, resetVersion]);

  useEffect(() => {
    if (!submission || !terminalRef.current || !canSendInput) {
      return;
    }

    if (lastSubmissionNonceRef.current === submission.nonce) {
      return;
    }

    lastSubmissionNonceRef.current = submission.nonce;
    void (async () => {
      const term = terminalRef.current;
      if (!term) {
        return;
      }

      term.focus();
      term.textarea?.focus();
      await noraTerminalClient.sendTerminalInput(sessionId, submission.value);
      await new Promise((resolve) => window.setTimeout(resolve, 16));
      await noraTerminalClient.sendWindowEnter();
    })();
  }, [sessionId, submission, canSendInput]);

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
      <div className="h-full w-full overflow-hidden p-3" style={{ backgroundColor: terminalTheme.background }}>
        <div ref={viewportRef} className="h-full w-full overflow-hidden" />
      </div>
    </div>
  );
};

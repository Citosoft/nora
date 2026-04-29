import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import { shouldApplyTerminalBufferReplay } from "@/components/app/logic/terminalBufferReplay";
import {
  getTerminalFontFamily,
  normalizeBufferedTerminalOutput,
  resolveTerminalTheme
} from "@/components/app/logic/terminalPresentation";
import {
  getCachedTerminalViewportSize,
  setCachedTerminalViewportSize
} from "@/components/app/logic/terminalViewportSizeCache";
import type {
  TerminalSubmitEnterMode,
  UseTerminalSessionArgs,
  UseTerminalSessionResult
} from "@/components/app/types/useTerminalSession.types";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { useEffect, useMemo, useRef } from "react";

async function submitTerminalEnter(
  sessionId: string,
  submitEnterMode: TerminalSubmitEnterMode
): Promise<void> {
  if (submitEnterMode === "window-enter") {
    await noraTerminalClient.sendWindowEnter();
    return;
  }

  await noraTerminalClient.sendTerminalInput(sessionId, "\r");
}

export function useTerminalSession({
  sessionId,
  resetVersion,
  focusVersion = 0,
  submission,
  canSendInput,
  resolvedTheme,
  terminalThemeId,
  terminalFontId,
  submitEnterMode
}: UseTerminalSessionArgs): UseTerminalSessionResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastSizeRef = useRef<{ cols: number; rows: number }>({ cols: 0, rows: 0 });
  const lastSubmissionNonceRef = useRef<number | null>(null);
  const liveEventCountRef = useRef(0);

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

    const terminal = new XtermTerminal({
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
        void navigator.clipboard.readText().then((text) => {
          if (text && canSendInput) {
            void noraTerminalClient.sendTerminalInput(sessionId, text);
          }
        }).catch(() => {
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
      liveEventCountRef.current += 1;
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
    const liveEventCountAtRequestStart = liveEventCountRef.current;

    void noraTerminalClient.getTerminalBuffer(sessionId).then((buffer) => {
      const terminal = terminalRef.current;
      if (cancelled || !terminal) {
        return;
      }
      if (!shouldApplyTerminalBufferReplay(liveEventCountAtRequestStart, liveEventCountRef.current)) {
        return;
      }
      terminal.reset();
      terminal.write(normalizeBufferedTerminalOutput(buffer));
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
      const terminal = terminalRef.current;
      if (!terminal) {
        return;
      }

      terminal.focus();
      terminal.textarea?.focus();
      await noraTerminalClient.sendTerminalInput(sessionId, submission.value);
      await new Promise((resolve) => window.setTimeout(resolve, 16));
      await submitTerminalEnter(sessionId, submitEnterMode);
    })();
  }, [sessionId, submission, canSendInput, submitEnterMode]);

  useEffect(() => {
    requestAnimationFrame(() => {
      terminalRef.current?.focus();
      terminalRef.current?.textarea?.focus();
    });
  }, [focusVersion]);

  return {
    containerRef,
    viewportRef,
    terminalRef,
    terminalThemeBackground: terminalTheme.background || ""
  };
}

import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import {
  getOrCreatePreservedTerminalSession,
  getPreservedTerminalSession
} from "@/components/app/logic/terminalSessionRegistry";
import { shouldApplyTerminalBufferReplay } from "@/components/app/logic/terminalBufferReplay";
import {
  getTerminalFontFamily,
  resolveTerminalTheme
} from "@/components/app/logic/terminalPresentation";
import type {
  TerminalSubmitEnterMode,
  UseTerminalSessionArgs,
  UseTerminalSessionResult
} from "@/components/app/types/useTerminalSession.types";
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
  const lastSubmissionNonceRef = useRef<number | null>(null);
  const applySizeRef = useRef<(() => void) | null>(null);

  const terminalTheme = useMemo(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    return resolveTerminalTheme(terminalThemeId, resolvedTheme, rootStyles);
  }, [resolvedTheme, terminalThemeId]);
  const fontFamily = useMemo(() => getTerminalFontFamily(terminalFontId), [terminalFontId]);

  useEffect(() => {
    if (!containerRef.current || !viewportRef.current) {
      return;
    }

    const entry = getOrCreatePreservedTerminalSession(sessionId, terminalTheme, fontFamily);
    entry.attachToViewport(viewportRef.current);
    terminalRef.current = entry.terminal;
    applySizeRef.current = entry.applySize;

    requestAnimationFrame(() => {
      applySizeRef.current?.();
      entry.terminal.focus();
      entry.terminal.textarea?.focus();
    });
    const scheduleApplySize = () => {
      requestAnimationFrame(() => {
        applySizeRef.current?.();
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      scheduleApplySize();
    });
    resizeObserver.observe(containerRef.current);

    const intersectionObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        scheduleApplySize();
      }
    });
    intersectionObserver.observe(containerRef.current);

    const handleWindowFocus = () => {
      scheduleApplySize();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        scheduleApplySize();
      }
    };

    window.addEventListener("resize", handleWindowFocus);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("resize", handleWindowFocus);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      entry.detachFromViewport();
      applySizeRef.current = null;
      terminalRef.current = null;
    };
  }, [sessionId, terminalTheme, fontFamily]);

  useEffect(() => {
    const entry = getPreservedTerminalSession(sessionId);
    if (!entry) {
      return;
    }

    entry.updateCanSendInput(canSendInput);
    entry.updatePresentation(terminalTheme, fontFamily);
    requestAnimationFrame(() => {
      entry.applySize();
    });
  }, [sessionId, canSendInput, terminalTheme, fontFamily]);

  useEffect(() => {
    const entry = getPreservedTerminalSession(sessionId);
    if (!entry || entry.lastAppliedResetVersion === resetVersion) {
      return;
    }

    let cancelled = false;
    const liveEventCountAtRequestStart = entry.liveEventCount;

    void noraTerminalClient.getTerminalBuffer(sessionId).then((buffer) => {
      if (cancelled) {
        return;
      }

      const currentEntry = getPreservedTerminalSession(sessionId);
      if (!currentEntry || currentEntry !== entry) {
        return;
      }

      if (!shouldApplyTerminalBufferReplay(liveEventCountAtRequestStart, currentEntry.liveEventCount)) {
        return;
      }

      currentEntry.terminal.reset();
      currentEntry.terminal.write(buffer);
      currentEntry.lastAppliedResetVersion = resetVersion;
      requestAnimationFrame(() => {
        currentEntry.applySize();
        currentEntry.terminal.focus();
        currentEntry.terminal.textarea?.focus();
      });
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, resetVersion]);

  useEffect(() => {
    if (!submission || !canSendInput) {
      return;
    }

    if (lastSubmissionNonceRef.current === submission.nonce) {
      return;
    }

    lastSubmissionNonceRef.current = submission.nonce;
    void (async () => {
      const entry = getPreservedTerminalSession(sessionId);
      if (!entry) {
        return;
      }

      entry.terminal.focus();
      entry.terminal.textarea?.focus();
      await noraTerminalClient.sendTerminalInput(sessionId, submission.value);
      await new Promise((resolve) => window.setTimeout(resolve, 16));
      await submitTerminalEnter(sessionId, submitEnterMode);
    })();
  }, [sessionId, submission, canSendInput, submitEnterMode]);

  useEffect(() => {
    requestAnimationFrame(() => {
      applySizeRef.current?.();
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

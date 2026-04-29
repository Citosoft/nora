import type { ResolvedTheme, TerminalFontId, TerminalSubmission, TerminalThemeId } from "@/components/app/types";
import type { Terminal as XtermTerminal } from "@xterm/xterm";
import type { MutableRefObject, RefObject } from "react";

export type TerminalSubmitEnterMode = "carriage-return" | "window-enter";

export type UseTerminalSessionArgs = {
  sessionId: string;
  resetVersion: number;
  focusVersion?: number;
  submission: TerminalSubmission | null;
  canSendInput: boolean;
  resolvedTheme: ResolvedTheme;
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
  submitEnterMode: TerminalSubmitEnterMode;
};

export type UseTerminalSessionResult = {
  containerRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  terminalRef: MutableRefObject<XtermTerminal | null>;
  terminalThemeBackground: string;
};

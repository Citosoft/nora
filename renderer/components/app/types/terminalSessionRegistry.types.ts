import type { ITheme, Terminal as XtermTerminal } from "@xterm/xterm";

export interface PreservedTerminalSessionEntry {
  sessionId: string;
  terminal: XtermTerminal;
  liveEventCount: number;
  lastAppliedResetVersion: number | null;
  attachToViewport: (viewportElement: HTMLDivElement) => void;
  detachFromViewport: () => void;
  updateCanSendInput: (canSendInput: boolean) => void;
  updatePresentation: (theme: ITheme, fontFamily: string) => void;
  applySize: () => void;
  dispose: () => void;
}

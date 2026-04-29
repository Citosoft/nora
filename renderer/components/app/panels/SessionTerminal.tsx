import { useTerminalSession } from "@/components/app/hooks/useTerminalSession";
import type { SessionTerminalProps } from "@/components/app/types/component.types";

export function SessionTerminal({
  sessionId,
  resetVersion,
  focusVersion = 0,
  submission,
  canSendInput,
  resolvedTheme,
  terminalThemeId,
  terminalFontId
}: SessionTerminalProps) {
  const { containerRef, viewportRef, terminalThemeBackground } = useTerminalSession({
    sessionId,
    resetVersion,
    focusVersion,
    submission,
    canSendInput,
    resolvedTheme,
    terminalThemeId,
    terminalFontId,
    submitEnterMode: "carriage-return"
  });

  return (
    <div ref={containerRef} className="min-h-0 min-w-0 w-full flex-1 overflow-hidden bg-background">
      <div
        className="h-full w-full overflow-hidden p-3"
        style={{ backgroundColor: terminalThemeBackground }}
      >
        <div ref={viewportRef} className="h-full w-full overflow-hidden" />
      </div>
    </div>
  );
}

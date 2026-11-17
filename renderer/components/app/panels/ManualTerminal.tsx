import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import { useSessionCenterPorts } from "@/components/app/hooks/useSessionCenterPorts";
import { useTerminalSession } from "@/components/app/hooks/useTerminalSession";
import { Button } from "@/components/ui/button";
import type { ManualTerminalProps } from "@/components/app/types/manualTerminal.types";

/** An explicit shell tool, independent of native assistant execution. */
export function ManualTerminal({ terminal }: ManualTerminalProps) {
  const { resolvedTheme, terminalThemeId, terminalFontId } = useSessionCenterPorts();
  const { containerRef, viewportRef, terminalRef, terminalThemeBackground } = useTerminalSession({ sessionId: terminal.id,
    resetVersion: 0, submission: null, canSendInput: terminal.status === "running", resolvedTheme, terminalThemeId, terminalFontId, submitEnterMode: "carriage-return" });
  return <section className="flex min-h-0 flex-1 flex-col" aria-label={`Terminal ${terminal.name}`}>
    <header className="flex items-center gap-3 border-b px-4 py-2 text-xs"><strong className="min-w-0 flex-1 truncate font-medium">{terminal.name}</strong>
      <span className="truncate text-muted-foreground">{terminal.currentWorkingDirectory || terminal.workspace}</span>
      <Button size="sm" variant="ghost" onClick={() => { terminalRef.current?.clear(); void noraTerminalClient.clearTerminal(terminal.id); }}>Clear</Button>
      <Button size="sm" variant="ghost" onClick={() => { void noraTerminalClient.restartTerminal(terminal.id); }}>Restart</Button>
    </header>
    <div className="min-h-0 flex-1 overflow-hidden p-2" ref={viewportRef} style={{ backgroundColor: terminalThemeBackground }}><div className="h-full min-h-0" ref={containerRef} /></div>
  </section>;
}

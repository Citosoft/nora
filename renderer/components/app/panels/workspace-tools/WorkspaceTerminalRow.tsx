import { useState } from "react";
import { Ellipsis, TerminalSquare } from "lucide-react";
import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import { setWorkspaceSplitViewItemDragData } from "@/components/app/logic/workspaceSplitViewDrag";
import type { WorkspaceTerminalRowProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function WorkspaceTerminalRow({ terminal, onSelect }: WorkspaceTerminalRowProps) {
  const actions = useWorkspaceSidebarActions();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(terminal.name);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!name.trim()) { setError("Enter a terminal name."); return; }
    try { await actions.onRenameTerminal(terminal.id, name.trim()); setEditing(false); setError(null); }
    catch { setError("Terminal could not be renamed."); }
  };
  return <div className="rounded-lg border border-border/60 p-3" draggable={!editing} onDragStart={(event) => setWorkspaceSplitViewItemDragData(event.dataTransfer, { projectId: terminal.projectId, item: { kind: "terminal", terminalId: terminal.id, sessionId: terminal.sessionId } })}>
    <div className="flex items-center gap-2"><TerminalSquare className="size-4 text-muted-foreground" />
      {editing ? <form className="flex flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); void save(); }}><Input autoFocus aria-label="Terminal name" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setEditing(false); }} /><Button size="sm" type="submit">Save</Button><Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>Cancel</Button></form>
      : <button className="min-w-0 flex-1 truncate text-left text-sm font-medium" onClick={() => { actions.onFocusTerminal(terminal.id); onSelect(terminal.id); }}>{terminal.name}</button>}
      <span className="text-xs text-muted-foreground">{terminal.isBusy ? "Busy" : terminal.status}</span>
      <DropdownMenu trigger={<Button variant="ghost" size="icon" className="size-7" aria-label={`Actions for ${terminal.name}`}><Ellipsis className="size-4" /></Button>}>
        <DropdownMenuItem onSelect={() => { setName(terminal.name); setEditing(true); }}>Rename</DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={() => { void actions.onDestroyTerminal(terminal.id); }}>Close terminal</DropdownMenuItem>
      </DropdownMenu>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Session details</summary><dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 break-all">
      <dt>Shell</dt><dd>{terminal.shellLabel}</dd><dt>Branch</dt><dd>{terminal.branch}</dd><dt>Directory</dt><dd>{terminal.currentWorkingDirectory ?? terminal.workspace}</dd><dt>Host</dt><dd>{terminal.host}</dd><dt>PID</dt><dd>{terminal.pid ?? "—"}</dd><dt>Command</dt><dd>{terminal.command || "Interactive shell"}</dd>
    </dl></details>
  </div>;
}

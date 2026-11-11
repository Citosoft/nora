import { useState } from "react";
import { Ellipsis, X } from "lucide-react";
import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import type { WorkspaceTerminalTabProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { TabsTrigger } from "@/components/ui/tabs";

export function WorkspaceTerminalTab({ terminal, selected }: WorkspaceTerminalTabProps) {
  const actions = useWorkspaceSidebarActions();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(terminal.name);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!name.trim()) { setError("Enter a terminal name."); return; }
    try { await actions.onRenameTerminal(terminal.id, name.trim()); setEditing(false); setError(null); }
    catch { setError("Terminal could not be renamed."); }
  };
  return <div className={`flex shrink-0 items-center rounded-md ${selected ? "bg-secondary" : "hover:bg-muted"}`}>
    <TabsTrigger value={terminal.id} className="max-w-48 truncate px-3 py-2 text-xs">{terminal.name}{terminal.isBusy && <span className="ml-2 size-1.5 shrink-0 rounded-full bg-primary" aria-label="Busy" />}</TabsTrigger>
    <DropdownMenu trigger={<Button variant="ghost" size="icon" className="size-6" aria-label={`Actions for ${terminal.name}`}><Ellipsis className="size-3" aria-hidden="true" /></Button>}>
      <DropdownMenuItem onSelect={() => { setName(terminal.name); setError(null); setEditing(true); }}>Rename</DropdownMenuItem>
      <div className="space-y-1 border-t px-3 py-2 text-[11px] text-muted-foreground"><p className="break-all">{terminal.currentWorkingDirectory ?? terminal.workspace}</p><p>{terminal.shellLabel} · {terminal.status} · PID {terminal.pid ?? "—"}</p>{terminal.branch && <p>{terminal.branch}</p>}</div>
      <DropdownMenuItem destructive onSelect={() => { void actions.onDestroyTerminal(terminal.id); }}>Stop and close terminal</DropdownMenuItem>
    </DropdownMenu>
    <Button variant="ghost" size="icon" className="mr-1 size-6" aria-label={`Stop and close terminal ${terminal.name}`} onClick={() => { void actions.onDestroyTerminal(terminal.id); }}><X className="size-3" aria-hidden="true" /></Button>
    <Dialog open={editing} onOpenChange={setEditing}><DialogContent headerTitle="Rename terminal" onClose={() => setEditing(false)}>
      <form onSubmit={(event) => { event.preventDefault(); void save(); }}><DialogBody><Input autoFocus aria-label="Terminal name" value={name} onChange={(event) => setName(event.target.value)} />{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}</DialogBody>
        <DialogFooter><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter></form>
    </DialogContent></Dialog>
  </div>;
}

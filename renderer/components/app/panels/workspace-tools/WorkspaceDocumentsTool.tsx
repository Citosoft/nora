import { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { useWorkspaceView } from "@/components/app/hooks/useWorkspaceView";
import type { WorkspaceSurfaceProps } from "@/components/app/types/workspaceToolSurfaces.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceEditor } from "./WorkspaceEditor";

export function WorkspaceDocumentsTool({ workspace, active }: WorkspaceSurfaceProps) {
  const projectId = workspace.project.id;
  const { noteCenterProps: notes, specCenterProps: specs } = useAppMainCenterContent();
  const { view, updateView } = useWorkspaceView(projectId);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const state = view.documentKind === "notes" ? notes.workspaceNotes[projectId] : specs.workspaceSpecs[projectId];
  const entries = view.documentKind === "notes" ? notes.workspaceNotes[projectId]?.notes ?? [] : specs.workspaceSpecs[projectId]?.specs ?? [];
  const visible = entries.filter((entry) => entry.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const open = view.documentKind === "notes" ? notes.onOpenNote : specs.onOpenSpec;
  const create = view.documentKind === "notes" ? notes.onCreateNote : specs.onCreateSpec;
  const remove = view.documentKind === "notes" ? notes.onDeleteNote : specs.onDeleteSpec;
  return <div className="grid h-full min-h-0 grid-cols-[minmax(180px,260px)_minmax(0,1fr)]">
    <aside className="flex min-h-0 flex-col border-r border-border/60" aria-label="Workspace documents">
      <Tabs value={view.documentKind} onValueChange={(value) => { if (value === "notes" || value === "specs") updateView({ documentKind: value }); }} className="p-3 pb-0"><TabsList className="w-full"><TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger><TabsTrigger value="specs" className="flex-1">Specs</TabsTrigger></TabsList></Tabs>
      <div className="flex gap-2 p-3"><Input aria-label="Find a document" placeholder="Find a document…" className="h-8 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} /><Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`New ${view.documentKind === "notes" ? "note" : "spec"}`} disabled={view.documentKind === "notes" ? notes.isCreatingNote : specs.isCreatingSpec} onClick={() => create(projectId)}><Plus className="size-4" aria-hidden="true" /></Button></div>
      {(error || state?.errorMessage) && <p role="alert" className="px-3 pb-2 text-xs text-destructive">{error ?? state?.errorMessage}</p>}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {visible.map((entry) => <div key={entry.path} className={`group flex items-center rounded-md ${view.documentPath === entry.path ? "bg-secondary" : "hover:bg-muted"}`}>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-current={view.documentPath === entry.path ? "page" : undefined} title={entry.path} onClick={() => { updateView({ documentPath: entry.path }); open(projectId, entry.path); }}><FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{entry.title}</span></button>
          <Button variant="ghost" size="icon" className="mr-1 size-6 opacity-0 focus-visible:opacity-100 group-hover:opacity-100" aria-label={`Delete ${entry.title}`} onClick={() => { void remove(projectId, entry.path).catch(() => setError("Document could not be deleted.")); }}><Trash2 className="size-3" aria-hidden="true" /></Button>
        </div>)}
        {!visible.length && <p className="px-2 py-3 text-xs text-muted-foreground">{state?.isLoading ? "Loading documents…" : query ? "No matching documents." : `No ${view.documentKind} yet.`}</p>}
      </div>
    </aside>
    <div className="flex min-h-0 min-w-0 flex-col"><WorkspaceEditor projectId={projectId} kind="documents" active={active} /></div>
  </div>;
}

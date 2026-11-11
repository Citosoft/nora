import { useState } from "react";
import { Pencil, Play, Plus, Repeat2, Trash2 } from "lucide-react";
import { useWorkspaceLoops } from "@/components/app/hooks/useWorkspaceLoops";
import type { WorkflowSelection, WorkspaceWorkflowsProps } from "@/components/app/types/workflowSurface.types";
import { isLoopRunDeletable } from "@shared/loopRunLifecycle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkflowDesigner } from "./workflows/WorkflowDesigner";
import { WorkflowRunSetup } from "./workflows/WorkflowRunSetup";
import { WorkflowRunMonitor } from "./workflows/WorkflowRunMonitor";

export function WorkspaceWorkflowsTool({ workspace, agentCatalog, onCreateChangeRequest }: WorkspaceWorkflowsProps) {
  const loops = useWorkspaceLoops(workspace.project.id);
  const [selection, setSelection] = useState<WorkflowSelection>({ kind: "overview" });
  const back = () => setSelection({ kind: "overview" });
  switch (selection.kind) {
    case "design": return <WorkflowDesigner key={selection.definition?.id ?? "new"} projectId={workspace.project.id} agentCatalog={agentCatalog} definition={selection.definition} onBack={back} onSaved={(definition) => { loops.upsertDefinition(definition); back(); }} />;
    case "run": return <WorkflowRunSetup definition={selection.definition} onBack={back} onStarted={(run) => { loops.upsertRun(run); setSelection({ kind: "monitor", runId: run.id }); }} />;
    case "monitor": {
      const run = loops.runs.find((entry) => entry.id === selection.runId);
      return run ? <WorkflowRunMonitor run={run} onBack={back} onRunChanged={loops.upsertRun} onCreateChangeRequest={onCreateChangeRequest} />
        : <div className="p-5"><p className="text-sm text-muted-foreground">This run is no longer available.</p><Button variant="ghost" onClick={back}>Back to workflows</Button></div>;
    }
    case "overview": break;
  }
  return <div className="h-full overflow-y-auto p-5">
    <div className="mb-5 flex items-center justify-between gap-3"><div><h3 className="text-sm font-medium">Reusable workflows</h3><p className="mt-1 text-xs text-muted-foreground">Define a repeatable process, choose a goal, and follow each run here.</p></div><Button size="sm" onClick={() => setSelection({ kind: "design", definition: null })}><Plus className="size-3.5" aria-hidden="true" />New workflow</Button></div>
    {loops.errorMessage && <p role="alert" className="mb-3 text-xs text-destructive">{loops.errorMessage}</p>}
    <div className="grid gap-6 xl:grid-cols-2">
      <section aria-label="Saved workflows" className="space-y-2"><h4 className="mb-3 text-xs font-medium text-muted-foreground">Saved workflows</h4>
        {loops.definitions.map((definition) => <div key={definition.id} className="flex items-center gap-2 rounded-lg border p-3"><Repeat2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <button type="button" className="min-w-0 flex-1 truncate text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelection({ kind: "design", definition })}>{definition.name}</button>
          <Button variant="ghost" size="icon" className="size-7" aria-label={`Edit ${definition.name}`} onClick={() => setSelection({ kind: "design", definition })}><Pencil className="size-3.5" aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon" className="size-7" aria-label={`Delete workflow ${definition.name}`} onClick={() => { if (window.confirm(`Delete the ${definition.name} workflow definition?`)) void loops.removeDefinition(definition.id); }}><Trash2 className="size-3.5" aria-hidden="true" /></Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => setSelection({ kind: "run", definition })}><Play className="size-3" aria-hidden="true" />Run</Button>
        </div>)}
        {!loops.definitions.length && <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">{loops.isLoading ? "Loading workflows…" : "Create a workflow when you have a process worth repeating."}</p>}
      </section>
      <section aria-label="Workflow runs" className="space-y-2"><h4 className="mb-3 text-xs font-medium text-muted-foreground">Runs</h4>
        {loops.runs.map((run) => <div key={run.id} className="flex items-center gap-2 rounded-lg border p-3"><button type="button" className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelection({ kind: "monitor", runId: run.id })}><span className="block truncate text-sm">{run.definition.name}</span><span className="text-[11px] text-muted-foreground">{run.iterations.length} iterations</span></button><Badge variant="outline">{run.status}</Badge>
          {isLoopRunDeletable(run.status) && <Button variant="ghost" size="icon" className="size-7" aria-label={`Delete ${run.definition.name} workflow run`} onClick={() => { if (window.confirm(`Delete the ${run.definition.name} workflow run?`)) void loops.removeRun(run.id); }}><Trash2 className="size-3.5" aria-hidden="true" /></Button>}
        </div>)}
        {!loops.runs.length && <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">Run a workflow to monitor its progress and output here.</p>}
      </section>
    </div>
  </div>;
}

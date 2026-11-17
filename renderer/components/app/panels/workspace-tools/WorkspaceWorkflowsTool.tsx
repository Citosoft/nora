import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useThreadWorkspaceSnapshot } from "@/components/app/hooks/useThreadWorkspaceSnapshot";
import { workflowRequestTargets } from "@/components/app/logic/workflowRequests";
import { useProjectBots } from "@/components/app/hooks/useProjectBots";
import { useState } from "react";
import { Plus, Repeat2 } from "lucide-react";
import { useWorkspaceLoops } from "@/components/app/hooks/useWorkspaceLoops";
import { buildWorkflowAgentSummaries } from "@/components/app/logic/workflowAgents";
import type { WorkflowSelection, WorkspaceWorkflowsProps } from "@/components/app/types/workflowSurface.types";
import { isLoopRunDeletable } from "@shared/loopRunLifecycle";
import { Button } from "@/components/ui/button";
import { WorkflowDefinitionRow } from "./workflows/WorkflowDefinitionRow";
import { WorkflowDesigner } from "./workflows/WorkflowDesigner";
import { WorkflowRunMonitor } from "./workflows/WorkflowRunMonitor";
import { WorkflowRunRow } from "./workflows/WorkflowRunRow";
import { WorkflowRunSetup } from "./workflows/WorkflowRunSetup";
import { WorkflowSurface } from "./workflows/WorkflowSurface";

export function WorkspaceWorkflowsTool({ workspace, agentCatalog, onCreateChangeRequest }: WorkspaceWorkflowsProps) {
  const { store } = useNativeRuntimePorts();
  const threads = useThreadWorkspaceSnapshot(store);
  const loops = useWorkspaceLoops(workspace.project.id);
  const bots = useProjectBots(workspace.project.id);
  const [selection, setSelection] = useState<WorkflowSelection>({ kind: "overview" });
  const back = () => setSelection({ kind: "overview" });
  switch (selection.kind) {
    case "design": return <WorkflowDesigner key={selection.definition?.id ?? "new"} projectId={workspace.project.id} agentCatalog={agentCatalog} definition={selection.definition} onBack={back} onSaved={(definition) => { loops.upsertDefinition(definition); back(); }} />;
    case "run": return <WorkflowRunSetup definition={selection.definition} onBack={back} onStarted={(run) => { loops.upsertRun(run); setSelection({ kind: "monitor", runId: run.id }); }} />;
    case "monitor": {
      const run = loops.runs.find((entry) => entry.id === selection.runId);
      return run ? <WorkflowRunMonitor run={run} onBack={back} onRunChanged={loops.upsertRun} onCreateChangeRequest={onCreateChangeRequest} />
        : <WorkflowSurface title="Workflow run" onBack={back}><p className="text-sm text-muted-foreground">This run is no longer available.</p></WorkflowSurface>;
    }
    case "overview": break;
  }
  const hasDefinitions = loops.definitions.length > 0;
  return <section aria-label="Workflows" className="h-full min-h-0 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-9 px-6 py-10 sm:px-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><Repeat2 className="size-4" aria-hidden="true" /><span>Workflows · {workspace.project.name}</span></div>
          <h1 className="text-3xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-2 text-sm text-muted-foreground">Define a repeatable process once, choose a goal for each run, and follow its progress here.</p>
        </div>
        <Button type="button" className="gap-1.5" onClick={() => setSelection({ kind: "design", definition: null })}><Plus className="size-4" aria-hidden="true" />New workflow</Button>
      </header>
      {loops.errorMessage && <p role="alert" className="text-sm text-destructive">{loops.errorMessage}</p>}
      <section aria-labelledby="workflows-saved" className="space-y-3">
        <h2 id="workflows-saved" className="text-sm font-medium">Saved workflows</h2>
        {hasDefinitions ? <ul className="divide-y rounded-md border">{loops.definitions.map((definition) => <WorkflowDefinitionRow key={definition.id} definition={definition}
          agents={buildWorkflowAgentSummaries(definition.stages, agentCatalog, bots)}
          onEdit={() => setSelection({ kind: "design", definition })} onRun={() => setSelection({ kind: "run", definition })}
          onDelete={() => { if (window.confirm(`Delete the ${definition.name} workflow definition?`)) void loops.removeDefinition(definition.id); }} />)}</ul>
          : <p className="text-sm text-muted-foreground">{loops.isLoading ? "Loading workflows…" : "Create a workflow when you have a process worth repeating, such as implement-then-review."}</p>}
      </section>
      <section aria-labelledby="workflows-runs" className="space-y-3">
        <h2 id="workflows-runs" className="text-sm font-medium">Runs</h2>
        {loops.runs.length ? <ul className="divide-y rounded-md border">{loops.runs.map((run) => <WorkflowRunRow key={run.id} run={run} needsInput={workflowRequestTargets(run.roles, threads.summaries).length > 0}
          onOpen={() => setSelection({ kind: "monitor", runId: run.id })}
          onDelete={isLoopRunDeletable(run.status) ? () => { if (window.confirm(`Delete the ${run.definition.name} workflow run?`)) void loops.removeRun(run.id); } : null} />)}</ul>
          : <p className="text-sm text-muted-foreground">{hasDefinitions ? "Run a workflow to follow its progress and output here." : "Runs appear here once you start a workflow."}</p>}
      </section>
    </div>
  </section>;
}

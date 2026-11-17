import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Button } from "@/components/ui/button";
import type { WorkspaceImportStepProps } from "@/components/app/types/workspaceImport.types";
import { LoaderCircle } from "lucide-react";

export function OnboardingWorkspaceImportStep({ state }: WorkspaceImportStepProps) {
  const { discovery, selected, imported, failures, isImporting } = state;
  if (discovery.kind === "loading") return <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Looking for projects used with Claude and Codex…</div>;
  if (discovery.kind === "failed") return <div className="space-y-3"><p role="alert" className="text-sm text-destructive">{discovery.message}</p><Button variant="outline" onClick={() => void state.discover()}>Retry</Button></div>;
  const pending = selected.filter((path) => !imported.includes(path)).length;
  return (
    <div className="min-h-0 space-y-4">
      <p className="text-sm text-muted-foreground">Add existing project folders to Nora. Your files stay where they are; Nora opens each project and creates its workspace state. You can import every project, choose individual projects, or continue without importing.</p>
      {discovery.result.warnings.map((warning) => <p key={warning} role="alert" className="text-sm text-destructive">{warning}</p>)}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={state.selectAll} disabled={isImporting || !discovery.result.workspaces.length}>Select all</Button>
        <Button variant="ghost" onClick={state.clearSelection} disabled={isImporting}>Clear selection</Button>
        <Button variant="ghost" onClick={() => void state.discover()} disabled={isImporting}>Scan again</Button>
      </div>
      {!discovery.result.workspaces.length ? <p className="text-sm text-muted-foreground">No additional local projects found. You can choose a folder in the next step.</p> : (
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border/70 p-2">
          {discovery.result.workspaces.map((workspace) => {
            const done = imported.includes(workspace.path);
            return <label key={workspace.path} className="flex items-center gap-3 rounded-md bg-card p-3">
              <input type="checkbox" className="size-4 shrink-0" checked={done || selected.includes(workspace.path)} disabled={isImporting || done} onChange={() => state.toggle(workspace.path)} />
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{workspace.name}</span><span className="block break-all text-xs text-muted-foreground">{workspace.path}</span></span>
              <span className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {workspace.sources.map((source) => {
                  const label = source === "claude" ? "Claude" : "Codex";
                  return <span key={source} className="inline-flex items-center gap-1.5">
                    <AgentToolIcon toolId={source} label={label} className="size-5 shrink-0" imageClassName="size-4" />
                    {label}
                  </span>;
                })}
                {done ? <span>Imported</span> : null}
              </span>
            </label>;
          })}
        </div>
      )}
      {failures.map((failure) => <p key={failure.path} role="alert" className="break-all text-sm text-destructive">{failure.path}: {failure.message}</p>)}
      <div className="flex items-center gap-3">
        <Button onClick={() => void state.importSelected()} disabled={isImporting || !pending}>
          {isImporting ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isImporting ? "Importing projects…" : `Import ${pending} selected ${pending === 1 ? "project" : "projects"}`}
        </Button>
        <span role="status" className="text-sm text-muted-foreground">{imported.length ? `${imported.length} imported` : ""}</span>
      </div>
    </div>
  );
}

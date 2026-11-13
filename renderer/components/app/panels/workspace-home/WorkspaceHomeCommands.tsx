import { useState } from "react";
import { Check, ChevronDown, Play } from "lucide-react";
import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { createScriptTerminalPayload } from "@/components/app/logic/workspaceScripts";
import type { WorkspaceHomeCommandsProps } from "@/components/app/types/workspace-home/home.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function WorkspaceHomeCommands({ projectId }: WorkspaceHomeCommandsProps) {
  const snapshot = useCanonicalAppSnapshot();
  const { onLaunchWorkspaceTerminal } = useWorkspaceSidebarActions();
  const { openTool } = useWorkspaceNavigation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (snapshot?.project?.id !== projectId || !snapshot.projectScripts.length) return null;
  const shellId = resolvePreferredTerminalShellId(snapshot.terminalShells);
  const scripts = snapshot.projectScripts;
  const selected = scripts.find((script) => script.id === selectedId) ?? scripts[0];
  const matching = scripts.filter((script) => script.command.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section aria-labelledby="home-commands-title">
    <h2 id="home-commands-title" className="text-sm font-medium">Project commands</h2>
    <div className="mt-3 flex max-w-lg items-center gap-2">
      <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
        <PopoverTrigger asChild><Button variant="outline" className="h-9 min-w-0 flex-1 justify-between gap-2 font-normal" aria-label={`Choose project command, selected ${selected.command}`}>
          <span className="truncate font-mono text-xs" title={selected.command}>{selected.command}</span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button></PopoverTrigger>
        <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] p-2" aria-label="Project commands">
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${scripts.length} commands…`} aria-label="Search project commands" className="mb-2 h-8 text-xs" />
          <div className="max-h-56 overflow-y-auto">
            {matching.map((script) => <button key={script.id} type="button" aria-pressed={selected.id === script.id}
              onClick={() => { setSelectedId(script.id); setOpen(false); setQuery(""); }}
              className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <span className="min-w-0 flex-1 break-all font-mono text-xs">{script.command}</span>{selected.id === script.id && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
            </button>)}
            {!matching.length && <p role="status" className="px-2 py-3 text-xs text-muted-foreground">No matching commands.</p>}
          </div>
        </PopoverContent>
      </Popover>
      <Button size="sm" className="h-9 shrink-0" disabled={!shellId} aria-label={`Run ${selected.command}`} onClick={() => {
          if (!shellId) return;
          onLaunchWorkspaceTerminal(projectId, createScriptTerminalPayload(selected, shellId));
          openTool(projectId, "terminals");
        }}><Play className="size-3.5" aria-hidden="true" />Run</Button>
    </div>
    {!shellId && <p role="status" className="mt-2 text-xs text-muted-foreground">No terminal shell is available to run these commands.</p>}
  </section>;
}

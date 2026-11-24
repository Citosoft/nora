import { useState } from "react";
import { Shapes } from "lucide-react";
import { WorkspaceFileIcon } from "@/lib/WorkspaceFileIcon";
import { outputKindLabel } from "@/components/app/constants/outputKinds";
import type { ThreadOutput, ThreadOutputsProps } from "@/components/app/types/threadOutputs.types";

function outputDetail(output: ThreadOutput): string {
  return output.source === "tool" && output.description ? `Generated · ${output.description}` : `${outputKindLabel(output.kind)} · ${output.path}`;
}

/** Non-code files the thread produced, newest first; each opens in the file viewer when it can show it. */
export function ThreadOutputs({ outputs, partial, onOpen }: ThreadOutputsProps) {
  const [error, setError] = useState<string | null>(null);
  const open = (output: ThreadOutput): void => {
    setError(null);
    onOpen(output).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : `${output.name} could not be opened.`));
  };
  return <div className="space-y-2 border-t border-border/50 pt-3">
    <p className="flex items-center gap-1.5 font-medium"><Shapes className="size-3.5" aria-hidden="true" />Outputs
      {outputs.length > 0 && <span className="font-normal tabular-nums text-muted-foreground">{outputs.length}</span>}</p>
    {outputs.length ? <ul className="space-y-0.5" aria-label="Thread outputs">{outputs.map((output) => {
      const detail = outputDetail(output);
      return <li key={output.key}>
        <button type="button" className="flex w-full min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={detail} aria-label={`Open ${output.name}`} onClick={() => open(output)}>
          <WorkspaceFileIcon path={output.name} className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1"><span className="block truncate">{output.name}</span>
            <span className="block truncate text-[9px] text-muted-foreground">{detail}</span></span>
        </button>
      </li>;
    })}</ul> : <p className="text-muted-foreground">Images and files the agent makes, other than code, appear here.</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {partial && outputs.length > 0 && <p className="text-[9px] text-muted-foreground">Earlier messages may hold more outputs.</p>}
  </div>;
}

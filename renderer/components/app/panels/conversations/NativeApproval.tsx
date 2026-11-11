import { ShieldCheck } from "lucide-react";
import type { NativeApprovalProps } from "@/components/app/types/nativeActivity.types";
import { NativeApprovalActions } from "./NativeApprovalActions";

export function NativeApproval({ request, disabled, onRespond }: NativeApprovalProps) {
  const details = request.details;
  return <div className="space-y-3" aria-busy={request.status === "responding"}>
    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"><ShieldCheck className="size-3.5" aria-hidden="true" />
      {details?.kind === "network" ? "Network access" : details?.kind === "files" ? "File access" : "Permission required"}</div>
    {details?.reason && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{details.reason}</p>}
    <div className="max-h-[35vh] space-y-2 overflow-y-auto">
      {details?.command && <pre className="overflow-auto rounded-md border bg-muted/40 p-2.5 text-xs whitespace-pre-wrap break-words">{details.command}</pre>}
      {details?.target && <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">{details.kind === "network" ? "Destination" : "Requested access"}</p>
        <p className="break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">{details.target}</p></div>}
      {details?.workingDirectory && <p className="break-all text-xs text-muted-foreground"><span className="font-medium">Working directory: </span>{details.workingDirectory}</p>}
      {!!details?.paths?.length && <ul aria-label="Affected files" className="space-y-1 rounded-md border bg-muted/40 p-2.5 font-mono text-xs">
        {details.paths.map((path) => <li key={path} className="break-all">{path}</li>)}</ul>}
      {details?.input && <pre className="overflow-auto rounded-md border bg-muted/40 p-2.5 text-xs whitespace-pre-wrap break-words">{details.input}</pre>}
    </div>
    <NativeApprovalActions request={request} disabled={disabled} onRespond={onRespond} />
  </div>;
}

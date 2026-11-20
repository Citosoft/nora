import { Eye, FileText, KeyRound, Zap } from "lucide-react";
import type { ImportAppAccessLineProps, ImportAppAccessProps } from "@/components/app/types/appsView.types";

/** What the app will be able to do once installed, as one quiet line so the review stays short. */
export function ImportAppAccess({ review }: ImportAppAccessProps) {
  const { actionCount, localFiles, connectors } = review;
  return <ul aria-label="What this app can do" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
    {actionCount
      ? <AccessItem icon={<Zap className="size-3.5" aria-hidden="true" />}>{actionCount === 1 ? "1 action" : `${actionCount} actions`}, asks before each</AccessItem>
      : <AccessItem icon={<Eye className="size-3.5" aria-hidden="true" />}>Read-only</AccessItem>}
    {localFiles.map((path) => <AccessItem key={path} icon={<FileText className="size-3.5" aria-hidden="true" />} title={path}>Reads {path.split(/[\\/]/).pop()}</AccessItem>)}
    {connectors.length ? <AccessItem icon={<KeyRound className="size-3.5" aria-hidden="true" />}>Uses your own accounts</AccessItem> : null}
  </ul>;
}

function AccessItem({ icon, title, children }: ImportAppAccessLineProps) {
  return <li title={title} className="flex min-w-0 items-center gap-1.5">{icon}<span className="truncate">{children}</span></li>;
}

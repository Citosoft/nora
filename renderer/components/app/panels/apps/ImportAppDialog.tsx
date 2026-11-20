import { useMemo, useState } from "react";
import { CircleAlert, Folder, Plus } from "lucide-react";
import { AppInstallFrame } from "./AppInstallFrame";
import { ImportAppAccess } from "./ImportAppAccess";
import { ImportConnectorRow } from "./ImportConnectorRow";
import { ImportReviewRow } from "./ImportReviewRow";
import { ConnectorGalleryDialog } from "@/components/app/dialogs/ConnectorGalleryDialog";
import { appFileSourceLabel, reviewAppImport } from "@/components/app/logic/apps/importReview";
import type { ImportAppDialogProps } from "@/components/app/types/appsView.types";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";

/** Before an app file becomes an app: what it can do, where it goes, and which local connector stands in for each one it names. */
export function ImportAppDialog({ draft, importer }: ImportAppDialogProps) {
  const [adding, setAdding] = useState(false);
  const { picked, choices, busy } = importer;
  const review = useMemo(() => picked ? reviewAppImport(picked.file, draft.available, choices) : null, [picked, draft.available, choices]);
  if (!picked || !review) return null;
  const { connectors } = draft;
  const needsSetup = review.needsSetup;
  return <>
    <AppInstallFrame open={!adding} busy={busy} onClose={importer.cancel} title={`Install ${picked.file.name}`} source={appFileSourceLabel(picked.path)}>
      <DialogBody className="space-y-4 px-5 py-4">
        <ImportAppAccess review={review} />
        <ul aria-label="Where the app goes and the connectors it uses" className="divide-y divide-border/60 rounded-lg border border-border/70 bg-background/40">
          <ImportReviewRow leading={<Folder className="size-4 text-muted-foreground" aria-hidden="true" />} label={<span className="truncate text-sm">Workspace</span>}>
            <Select aria-label="Workspace" className="h-8 w-full text-xs" value={draft.workspace?.id ?? ""} onChange={(event) => draft.selectWorkspace(event.target.value)} disabled={busy}>
              {draft.boot.workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </Select>
          </ImportReviewRow>
          {review.connectors.map((entry) => <ImportConnectorRow key={entry.fileId} entry={entry} disabled={busy} onChoose={(id) => importer.choose(entry.fileId, id)} />)}
        </ul>
        {needsSetup ? <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">{needsSetup === 1 ? "1 connector needs" : `${needsSetup} connectors need`} a key or private sign-in. Add it and it is picked up here.</p>
          <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 gap-1 text-xs" onClick={() => setAdding(true)} disabled={busy}>
            <Plus className="size-3.5" aria-hidden="true" />Add connector</Button>
        </div> : null}
        {importer.error ? <p role="alert" className="text-sm text-destructive">{importer.error}</p> : null}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={importer.cancel} disabled={busy}>Cancel</Button>
        <Button type="button" onClick={importer.confirm} disabled={needsSetup > 0 || busy}>{busy ? "Installing…" : "Install"}</Button>
      </DialogFooter>
    </AppInstallFrame>
    <ConnectorGalleryDialog open={adding} onOpenChange={setAdding} onCreate={connectors.create} accessChoices={draft.accessChoices} addedUrls={(connectors.connectors ?? []).map((entry) => entry.url)} />
  </>;
}

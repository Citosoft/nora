import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRemoteActivity } from "@/components/app/logic/remote-access/presentation";
import type { RemoteAccessControls } from "@/components/app/types/remoteAccess.types";
import { SettingsCard } from "./settingsUi";

export function RemoteActivityCard({ controls }: { controls: RemoteAccessControls }) {
  const [open, setOpen] = useState(false);
  const count = controls.activity.length;
  return <SettingsCard label="Recent remote activity">
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <button type="button" aria-expanded={open} aria-controls="remote-activity-list" onClick={() => setOpen((value) => !value)} className="flex min-w-0 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">Recent remote activity</span>
        <span className="text-sm text-muted-foreground">{count === 1 ? "1 event" : `${count} events`}</span>
      </button>
      <Button variant="outline" size="sm" onClick={() => { void controls.refreshActivity(); }}>Refresh</Button>
    </div>
    {controls.activityError ? <p role="alert" className="px-5 py-3 text-sm text-destructive">{controls.activityError}</p> : null}
    {open ? <div id="remote-activity-list" className="px-5 py-3">
      {count ? <ul className="space-y-2 text-sm text-muted-foreground">{controls.activity.map((entry, index) => <li key={`${entry.at}-${index}`}><time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time> · {formatRemoteActivity(entry)}</li>)}</ul>
        : <p className="text-sm text-muted-foreground">No recent remote activity.</p>}
    </div> : null}
  </SettingsCard>;
}

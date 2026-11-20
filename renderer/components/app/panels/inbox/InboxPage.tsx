import { CheckCheck, Inbox, Search } from "lucide-react";
import { useInboxView } from "@/components/app/hooks/useInboxView";
import { INBOX_VIEW_LABELS } from "@/components/app/logic/inbox/sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InboxSectionList } from "./InboxSectionList";

const EMPTY_MESSAGES = {
  all: "Approvals, questions and finished work from your agents and bots show up here.",
  "needs-you": "Nothing is waiting on you right now.",
  updates: "Finished threads and workflows you haven't seen show up here.",
  snoozed: "Snoozed items wait here until their time comes."
} as const;

/** Everything across your workspaces that needs you, then what finished while you were away. */
export function InboxPage() {
  const model = useInboxView();
  return <section aria-label="Inbox" className="min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><Inbox className="size-4" aria-hidden="true" /><span>Inbox</span></div>
          <h1 className="text-3xl font-semibold tracking-tight">{INBOX_VIEW_LABELS[model.view]}</h1>
        </div>
        {model.markAllRead && <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={model.markAllRead}>
          <CheckCheck className="size-3.5" aria-hidden="true" />Mark all read</Button>}
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" />
          <Input type="search" className="h-8 pl-8 text-xs" placeholder="Search inbox…" aria-label="Search inbox" value={model.query} onChange={(event) => model.setQuery(event.target.value)} /></div>
        {model.scope && <div role="group" aria-label="Show items from" className="flex rounded-md border p-0.5">
          <Button type="button" variant="ghost" size="sm" aria-pressed={!model.scope.workspaceOnly} className={`h-7 px-2 text-xs ${!model.scope.workspaceOnly ? "bg-secondary" : "text-muted-foreground"}`}
            onClick={() => model.scope?.setWorkspaceOnly(false)}>All workspaces</Button>
          <Button type="button" variant="ghost" size="sm" aria-pressed={model.scope.workspaceOnly} className={`h-7 max-w-[12rem] truncate px-2 text-xs ${model.scope.workspaceOnly ? "bg-secondary" : "text-muted-foreground"}`}
            onClick={() => model.scope?.setWorkspaceOnly(true)}>{model.scope.workspaceName}</Button>
        </div>}
      </div>
      {model.error && <p role="alert" className="text-sm text-destructive">{model.error}</p>}
      {model.loading ? <p role="status" className="text-sm text-muted-foreground">Loading your inbox…</p>
        : <InboxSectionList sections={model.sections} now={model.now} actions={model.actions} emptyMessage={EMPTY_MESSAGES[model.view]} />}
    </div>
  </section>;
}

import { useMemo, useState } from "react";
import { CircleDot, GitPullRequest, LoaderCircle, RefreshCcw, Search, SearchX, Settings } from "lucide-react";
import { useSessionCenterPorts } from "@/components/app/hooks/useSessionCenterPorts";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { isDraftRequest, selectForgeItems } from "@/components/app/logic/forge-items/list";
import type { ForgeItemsToolProps, ItemFilter, ItemSort } from "@/components/app/types/forge-items/list.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ItemTable } from "./ItemTable";

export function ForgeItemsTool({ workspace, kind }: ForgeItemsToolProps) {
  const { forgeItems } = useSessionCenterPorts();
  const native = useNativeRuntimePorts();
  const { closeTool } = useWorkspaceNavigation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [sort, setSort] = useState<ItemSort>("updated");
  const current = workspace.project.id === forgeItems.projectId;
  const overview = current ? forgeItems.overview : null;
  const loading = !current || forgeItems.loading || !overview;
  const issues = kind === "issue";
  const noun = issues ? "issues" : "requests";
  const Icon = issues ? CircleDot : GitPullRequest;
  const requests = useMemo(() => selectForgeItems((issues ? overview?.issues : overview?.pullRequests) ?? [], { query, filter, sort }, kind), [overview, query, filter, sort, kind, issues]);
  const draftCount = overview?.pullRequests.filter(isDraftRequest).length ?? 0;
  const provider = overview?.repo?.provider ?? "gitlab";
  const title = issues ? "Issues" : provider === "github" ? "Pull requests" : "Merge requests";
  const error = overview?.errorMessage;
  return <section aria-label={`${title} for ${workspace.project.name}`} className="flex h-full min-h-0 min-w-0 flex-col bg-background">
    <header className="workspace-shell-surface workspace-chrome-surface shrink-0 border-b border-border/60 px-5 py-4 sm:px-8 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{workspace.project.name}{overview?.repo ? ` / ${overview.repo.fullName}` : ""}</p>
          <h1 className="mt-2 flex items-center gap-2.5 text-xl font-semibold"><Icon className="size-5 text-muted-foreground" aria-hidden="true" />{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Recent open {noun} from this workspace’s repository.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={forgeItems.refresh} disabled={loading}>
          <RefreshCcw className={`size-3.5 ${loading ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />Refresh
        </Button>
      </div>
    </header>
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <div className="w-full">
        <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <div className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={issues ? "Search title, author or number…" : "Search title, author, branch or number…"} aria-label={`Search workspace ${noun}`} className="h-9 pl-9" />
          </div>
          {!issues && <Select aria-label="Filter requests" value={filter} className="h-9 w-36" onChange={(event) => {
            const value = event.target.value;
            if (value === "all" || value === "ready" || value === "draft") setFilter(value);
          }}>
            <option value="all">All open</option><option value="ready">Non-drafts</option><option value="draft">Drafts</option>
          </Select>}
          <Select aria-label={`Sort ${noun}`} value={sort} className="h-9 w-44" onChange={(event) => {
            const value = event.target.value;
            if (value === "updated" || value === "newest" || value === "title") setSort(value);
          }}>
            <option value="updated">Recently updated</option><option value="newest">Newest number</option><option value="title">Title</option>
          </Select>
        </div>
        {loading ? <div role="status" className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />Loading workspace {noun}…</div>
          : error ? <div role="alert" className="mx-4 my-4 rounded-lg border border-destructive/30 bg-destructive/5 p-5 sm:mx-6">
            <p className="text-sm text-destructive">{error}</p><div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={forgeItems.refresh}>Retry</Button><Button type="button" size="sm" variant="ghost" onClick={forgeItems.openIntegrations}>Check integrations</Button></div>
          </div>
          : !overview?.repo ? <div className="mx-4 my-4 rounded-lg border border-dashed border-border p-8 text-center sm:mx-6">
            <Icon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" /><h2 className="mt-4 text-base font-medium">Connect this repository</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Use a GitHub or GitLab remote and connect the matching account in Integrations to see this workspace’s {noun}.</p>
            <Button type="button" variant="outline" size="sm" className="mt-5" onClick={forgeItems.openIntegrations}><Settings className="size-3.5" aria-hidden="true" />Open integrations</Button>
          </div>
          : <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border/60 px-4 py-3 text-xs text-muted-foreground sm:px-6"><p aria-live="polite">{requests.length} {requests.length === 1 ? (issues ? "issue" : "request") : noun}{query || filter !== "all" ? " matching your filters" : " loaded"}</p><span>{!issues && <>{draftCount} {draftCount === 1 ? "draft" : "drafts"} · </>}{provider === "github" ? "GitHub" : "GitLab"}</span></div>
            {requests.length ? <ItemTable kind={kind} items={requests} projectId={workspace.project.id} repo={overview.repo} readDetail={forgeItems.readDetail} onOpen={(item) => {
              native.store.deactivate(); closeTool(); forgeItems.open(workspace.project.id, kind, item);
            }} /> : <div className="mx-4 my-4 rounded-lg border border-dashed border-border p-10 text-center sm:mx-6">
              <SearchX className="mx-auto size-7 text-muted-foreground" aria-hidden="true" /><h2 className="mt-4 text-base font-medium">{query || filter !== "all" ? `No matching ${noun}` : `No open ${noun}`}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{query || filter !== "all" ? "Try another search or clear your filters." : "Open repository items will appear here."}</p>
              {(query || filter !== "all") && <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</Button>}
            </div>}
          </>}
      </div>
    </div>
  </section>;
}

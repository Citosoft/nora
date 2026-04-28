import type { VercelPanelProps } from "@/components/app/types/component.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { VercelDeploymentSummary, VercelProjectSummary } from "@shared/appTypes";
import { ExternalLink, Link2, RefreshCcw, Unplug } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function VercelMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 4 20 18H4L12 4Z" />
    </svg>
  );
}

function formatDeploymentState(deployment: VercelDeploymentSummary): string {
  return deployment.readyState || deployment.state || "unknown";
}

function getDeploymentStatusBadgeClassName(deployment: VercelDeploymentSummary): string {
  const state = formatDeploymentState(deployment).toLowerCase();
  if (state === "ready" || state === "succeeded" || state === "success") {
    return "!border-emerald-200 !bg-emerald-100 !text-emerald-800 dark:!border-emerald-300/60 dark:!bg-emerald-500/35 dark:!text-emerald-50";
  }
  if (state === "building" || state === "queued" || state === "pending" || state === "initializing") {
    return "!border-amber-200 !bg-amber-100 !text-amber-800 dark:!border-amber-300/60 dark:!bg-amber-500/30 dark:!text-amber-50";
  }
  if (state === "error" || state === "failed" || state === "canceled") {
    return "!border-rose-200 !bg-rose-100 !text-rose-800 dark:!border-rose-300/60 dark:!bg-rose-500/30 dark:!text-rose-50";
  }
  return "!border-border !bg-transparent !text-foreground dark:!border-border/70 dark:!bg-muted/35 dark:!text-foreground";
}

function formatProjectCaption(project: VercelProjectSummary): string {
  const parts = [project.accountName || project.accountSlug || "Personal"];
  if (project.link?.repo && project.link?.org) {
    parts.push(`${project.link.org}/${project.link.repo}`);
  }
  return parts.join(" • ");
}

export function VercelPanel({
  isConnected,
  accountLabel,
  projects,
  deployments,
  linkedProject,
  suggestedProject,
  isLoadingProjects,
  isLoadingDeployments,
  redeployingDeploymentId,
  projectsErrorMessage,
  deploymentsErrorMessage,
  onRefreshProjects,
  onRefreshDeployments,
  onRedeployDeployment,
  onOpenUrl,
  onOpenSettings,
  onLinkProject,
  onUnlinkProject
}: VercelPanelProps) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const recentDeployments = useMemo(() => deployments.slice(0, 5), [deployments]);
  const currentProductionDeploymentId = useMemo(() => {
    const productionDeployment = deployments.find((deployment) => {
      const state = formatDeploymentState(deployment).toLowerCase();
      const target = (deployment.target || "").toLowerCase();
      return target === "production" && (state === "ready" || state === "succeeded" || state === "success");
    });
    return productionDeployment?.id ?? null;
  }, [deployments]);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    if (linkedProject) {
      setSelectedProjectId(linkedProject.id);
      return;
    }
    if (suggestedProject) {
      setSelectedProjectId(suggestedProject.id);
      return;
    }
    setSelectedProjectId(projects[0]?.id || "");
  }, [linkedProject, suggestedProject, projects]);

  if (!isConnected) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <VercelMark className="size-8 text-foreground" />
        <div>Connect Vercel in Settings before loading workspace deployment data.</div>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          Open settings
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/20">
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <VercelMark className="size-4 shrink-0" />
              <span className="truncate">{linkedProject ? linkedProject.name : "Vercel"}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {linkedProject
                ? formatProjectCaption(linkedProject)
                : accountLabel
                  ? `Connected as ${accountLabel}`
                  : "Choose a Vercel project for this workspace"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {linkedProject?.webUrl ? (
              <Button variant="outline" size="sm" onClick={() => onOpenUrl(linkedProject.webUrl || "")}>
                <ExternalLink className="size-4" />
                Open
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={onRefreshProjects} disabled={isLoadingProjects}>
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>
        {linkedProject ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">Linked</Badge>
            {linkedProject.framework ? <Badge variant="outline">{linkedProject.framework}</Badge> : null}
            {linkedProject.link?.productionBranch ? <Badge variant="outline">{linkedProject.link.productionBranch}</Badge> : null}
            <Button variant="outline" size="sm" onClick={onUnlinkProject}>
              <Unplug className="size-4" />
              Unlink
            </Button>
          </div>
        ) : null}
        {projectsErrorMessage ? <div className="mt-2 text-xs text-destructive">{projectsErrorMessage}</div> : null}
      </div>

      {!linkedProject ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {suggestedProject ? (
            <div className="rounded-[8px] border border-primary/35 bg-primary/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Link2 className="size-3.5" />
                Suggested match
              </div>
              <div className="mt-2 text-sm font-medium text-foreground">{suggestedProject.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{formatProjectCaption(suggestedProject)}</div>
              <div className="mt-3">
                <Button size="sm" onClick={() => onLinkProject(suggestedProject.id)}>
                  <Link2 className="size-4" />
                  Link suggested project
                </Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-[8px] border border-border/60 bg-card/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Match workspace
            </div>
            <div className="mt-3 space-y-3">
              <Select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                disabled={isLoadingProjects || projects.length === 0}
              >
                <option value="">Select a Vercel project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} • {project.accountName || project.accountSlug || "Personal"}
                  </option>
                ))}
              </Select>
              {selectedProject ? (
                <div className="rounded-[6px] border border-border/50 bg-background/55 p-3">
                  <div className="text-sm font-medium text-foreground">{selectedProject.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatProjectCaption(selectedProject)}</div>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={!selectedProjectId} onClick={() => onLinkProject(selectedProjectId)}>
                  <Link2 className="size-4" />
                  Link project
                </Button>
                <div className="text-xs text-muted-foreground">
                  Auto-matching prefers the connected Git repo when available, then falls back to workspace naming.
                </div>
              </div>
            </div>
          </div>

          {!projects.length && !isLoadingProjects ? (
            <div className="rounded-[8px] border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
              No Vercel projects were found for this account.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-border/40 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Deployments</div>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshDeployments}
                disabled={isLoadingDeployments}
              >
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
            </div>
            {deploymentsErrorMessage ? <div className="mt-2 text-xs text-destructive">{deploymentsErrorMessage}</div> : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {recentDeployments.length ? (
                recentDeployments.map((deployment) => (
                  <div key={deployment.id} className="rounded-[8px] border border-border/50 bg-card/70 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="truncate text-sm font-medium text-foreground">
                            {deployment.branch || linkedProject.name}
                          </div>
                          {deployment.id === currentProductionDeploymentId ? (
                            <Badge variant="outline" className="!border-transparent !bg-sky-600/15 !text-sky-700 dark:!bg-sky-400/20 dark:!text-sky-200">
                              Current
                            </Badge>
                          ) : null}
                          {deployment.target ? <Badge variant="outline">{deployment.target}</Badge> : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{new Date(deployment.createdAt).toLocaleString()}</span>
                          {deployment.creator ? <span>{deployment.creator}</span> : null}
                          {deployment.commitSha ? <span>{deployment.commitSha.slice(0, 7)}</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className={getDeploymentStatusBadgeClassName(deployment)}>
                          {formatDeploymentState(deployment)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRedeployDeployment(deployment)}
                          disabled={redeployingDeploymentId === deployment.id}
                        >
                          {redeployingDeploymentId === deployment.id ? "Working" : "Redeploy"}
                        </Button>
                        {deployment.url ? (
                          <Button variant="ghost" size="icon" onClick={() => onOpenUrl(deployment.url || "")} aria-label="Open deployment">
                            <ExternalLink className="size-4" />
                          </Button>
                        ) : deployment.inspectorUrl ? (
                          <Button variant="ghost" size="icon" onClick={() => onOpenUrl(deployment.inspectorUrl || "")} aria-label="Open deployment inspector">
                            <ExternalLink className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[8px] border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
                  {isLoadingDeployments ? "Loading deployments..." : "No recent deployments found for this project."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import { canAutoLinkVercelProject, findSuggestedVercelProject } from "@/components/app/logic/appUtils";
import type { UseVercelIntegrationArgs, UseVercelIntegrationResult } from "@/components/app/types/appHooks.types";
import type {
  VercelDeploymentSummary,
  VercelProjectSummary,
  VercelRuntimeLogEntry,
  VercelRuntimeLogStreamEvent
} from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useVercelIntegration({
  activeChangesPanelTab,
  forgeOverview,
  vercelToken,
  vercelWorkspaceLinks,
  updateVercelWorkspaceLinks,
  updateVercelToken,
  updateVercelAccountLabel
}: UseVercelIntegrationArgs): UseVercelIntegrationResult {
  const snapshot = useCanonicalAppSnapshot();
  const [vercelProjects, setVercelProjects] = useState<VercelProjectSummary[]>([]);
  const [isLoadingVercelProjects, setIsLoadingVercelProjects] = useState(false);
  const [vercelProjectsErrorMessage, setVercelProjectsErrorMessage] = useState<string | null>(null);
  const [vercelDeployments, setVercelDeployments] = useState<VercelDeploymentSummary[]>([]);
  const [isLoadingVercelDeployments, setIsLoadingVercelDeployments] = useState(false);
  const [vercelRuntimeLogs, setVercelRuntimeLogs] = useState<VercelRuntimeLogEntry[]>([]);
  const [isLoadingVercelRuntimeLogs, setIsLoadingVercelRuntimeLogs] = useState(false);
  const [isStreamingVercelRuntimeLogs, setIsStreamingVercelRuntimeLogs] = useState(false);
  const [redeployingVercelDeploymentId, setRedeployingVercelDeploymentId] = useState<string | null>(null);
  const [vercelDeploymentsErrorMessage, setVercelDeploymentsErrorMessage] = useState<string | null>(null);
  const [vercelRuntimeLogsErrorMessage, setVercelRuntimeLogsErrorMessage] = useState<string | null>(null);
  const activeVercelRuntimeLogDeploymentIdRef = useRef<string | null>(null);

  const currentVercelLink = snapshot?.project ? vercelWorkspaceLinks[snapshot.project.id] ?? null : null;
  const linkedVercelProject = currentVercelLink
    ? vercelProjects.find((project) =>
      project.id === currentVercelLink.vercelProjectId &&
      (currentVercelLink.teamId ? project.teamId === currentVercelLink.teamId : true)
    ) ?? null
    : null;
  const activeVercelLogDeployment = useMemo(() => (
    vercelDeployments.find((deployment) => {
      const state = (deployment.readyState || deployment.state || "").toLowerCase();
      return (deployment.target || "").toLowerCase() === "production" && (state === "ready" || state === "succeeded" || state === "success");
    }) || vercelDeployments[0] || null
  ), [vercelDeployments]);
  const suggestedVercelProject = snapshot?.project
    ? findSuggestedVercelProject(
      vercelProjects,
      snapshot.project.name,
      forgeOverview?.repo
        ? {
            provider: forgeOverview.repo.provider,
            owner: forgeOverview.repo.owner,
            name: forgeOverview.repo.name,
            webUrl: forgeOverview.repo.webUrl
          }
        : null
    )
    : null;

  const startVercelRuntimeLogStream = useCallback(async (): Promise<void> => {
    if (!vercelToken.trim() || !linkedVercelProject || !activeVercelLogDeployment) {
      activeVercelRuntimeLogDeploymentIdRef.current = null;
      setVercelRuntimeLogs([]);
      setIsLoadingVercelRuntimeLogs(false);
      setIsStreamingVercelRuntimeLogs(false);
      setVercelRuntimeLogsErrorMessage(null);
      await noraIntegrationClient.stopVercelRuntimeLogStream();
      return;
    }

    activeVercelRuntimeLogDeploymentIdRef.current = activeVercelLogDeployment.id;
    setVercelRuntimeLogs([]);
    setIsLoadingVercelRuntimeLogs(true);
    setIsStreamingVercelRuntimeLogs(false);
    setVercelRuntimeLogsErrorMessage(null);
    await noraIntegrationClient.startVercelRuntimeLogStream({
      token: vercelToken,
      vercelProjectId: linkedVercelProject.id,
      deploymentId: activeVercelLogDeployment.id,
      teamId: linkedVercelProject.teamId
    });
    setIsLoadingVercelRuntimeLogs(false);
    setIsStreamingVercelRuntimeLogs(true);
  }, [vercelToken, linkedVercelProject, activeVercelLogDeployment]);

  useEffect(() => {
    if (!vercelToken.trim()) {
      setVercelProjects([]);
      setIsLoadingVercelProjects(false);
      setVercelProjectsErrorMessage(null);
      return;
    }

    let mounted = true;
    setIsLoadingVercelProjects(true);
    setVercelProjectsErrorMessage(null);

    noraIntegrationClient.listVercelProjects(vercelToken).then((projects) => {
      if (!mounted) {
        return;
      }
      setVercelProjects(projects);
      setIsLoadingVercelProjects(false);
    }).catch((error: unknown) => {
      if (!mounted) {
        return;
      }
      setVercelProjects([]);
      setIsLoadingVercelProjects(false);
      setVercelProjectsErrorMessage(error instanceof Error ? error.message : "Unable to load Vercel projects.");
    });

    return () => {
      mounted = false;
    };
  }, [vercelToken]);

  useEffect(() => {
    if (!snapshot?.project || !suggestedVercelProject || currentVercelLink || !canAutoLinkVercelProject(
      suggestedVercelProject,
      forgeOverview?.repo
        ? {
            provider: forgeOverview.repo.provider,
            owner: forgeOverview.repo.owner,
            name: forgeOverview.repo.name,
            webUrl: forgeOverview.repo.webUrl
          }
        : null
    )) {
      return;
    }

    updateVercelWorkspaceLinks({
      ...vercelWorkspaceLinks,
      [snapshot.project.id]: {
        vercelProjectId: suggestedVercelProject.id,
        teamId: suggestedVercelProject.teamId
      }
    });
  }, [snapshot?.project, suggestedVercelProject, currentVercelLink, forgeOverview?.repo, vercelWorkspaceLinks, updateVercelWorkspaceLinks]);

  useEffect(() => {
    if (!vercelToken.trim() || !linkedVercelProject) {
      setVercelDeployments([]);
      setIsLoadingVercelDeployments(false);
      setVercelDeploymentsErrorMessage(null);
      return;
    }

    let mounted = true;
    setIsLoadingVercelDeployments(true);
    setVercelDeploymentsErrorMessage(null);

    noraIntegrationClient.listVercelDeployments(vercelToken, linkedVercelProject.id, linkedVercelProject.teamId).then((deployments) => {
      if (!mounted) {
        return;
      }
      setVercelDeployments(deployments);
      setIsLoadingVercelDeployments(false);
    }).catch((error: unknown) => {
      if (!mounted) {
        return;
      }
      setVercelDeployments([]);
      setIsLoadingVercelDeployments(false);
      setVercelDeploymentsErrorMessage(error instanceof Error ? error.message : "Unable to load Vercel deployments.");
    });

    return () => {
      mounted = false;
    };
  }, [vercelToken, linkedVercelProject?.id, linkedVercelProject?.teamId]);

  useEffect(() => {
    return noraIntegrationClient.onVercelRuntimeLogEvent((payload: VercelRuntimeLogStreamEvent) => {
      if (payload.deploymentId !== activeVercelRuntimeLogDeploymentIdRef.current) {
        return;
      }

      if (payload.type === "connected") {
        setIsLoadingVercelRuntimeLogs(false);
        setIsStreamingVercelRuntimeLogs(true);
        setVercelRuntimeLogsErrorMessage(null);
        return;
      }

      if (payload.type === "entry") {
        setIsLoadingVercelRuntimeLogs(false);
        setIsStreamingVercelRuntimeLogs(true);
        setVercelRuntimeLogs((current) => {
          if (current.some((entry) => entry.rowId === payload.entry.rowId)) {
            return current;
          }
          return [payload.entry, ...current];
        });
        return;
      }

      if (payload.type === "error") {
        setIsLoadingVercelRuntimeLogs(false);
        setIsStreamingVercelRuntimeLogs(false);
        setVercelRuntimeLogsErrorMessage(payload.message);
        return;
      }

      setIsLoadingVercelRuntimeLogs(false);
      setIsStreamingVercelRuntimeLogs(false);
    });
  }, []);

  useEffect(() => {
    if (!vercelToken.trim() || !linkedVercelProject || !activeVercelLogDeployment) {
      activeVercelRuntimeLogDeploymentIdRef.current = null;
      setVercelRuntimeLogs([]);
      setIsLoadingVercelRuntimeLogs(false);
      setIsStreamingVercelRuntimeLogs(false);
      setVercelRuntimeLogsErrorMessage(null);
      void noraIntegrationClient.stopVercelRuntimeLogStream();
      return;
    }

    if (activeChangesPanelTab !== "vercel") {
      setIsStreamingVercelRuntimeLogs(false);
      void noraIntegrationClient.stopVercelRuntimeLogStream();
      return;
    }

    void startVercelRuntimeLogStream().catch((error: unknown) => {
      setIsLoadingVercelRuntimeLogs(false);
      setIsStreamingVercelRuntimeLogs(false);
      setVercelRuntimeLogs([]);
      setVercelRuntimeLogsErrorMessage(error instanceof Error ? error.message : "Unable to stream Vercel logs.");
    });

    return () => {
      activeVercelRuntimeLogDeploymentIdRef.current = null;
      setIsStreamingVercelRuntimeLogs(false);
      void noraIntegrationClient.stopVercelRuntimeLogStream();
    };
  }, [activeChangesPanelTab, vercelToken, linkedVercelProject?.id, linkedVercelProject?.teamId, activeVercelLogDeployment?.id, startVercelRuntimeLogStream]);

  const disconnectVercelAccount = useCallback(() => {
    activeVercelRuntimeLogDeploymentIdRef.current = null;
    void noraIntegrationClient.stopVercelRuntimeLogStream();
    updateVercelToken("");
    updateVercelAccountLabel(null);
    setVercelProjects([]);
    setVercelDeployments([]);
    setVercelRuntimeLogs([]);
    setIsStreamingVercelRuntimeLogs(false);
    setVercelProjectsErrorMessage(null);
    setVercelDeploymentsErrorMessage(null);
    setVercelRuntimeLogsErrorMessage(null);
  }, [updateVercelAccountLabel, updateVercelToken]);

  const refreshVercelProjects = useCallback(async (): Promise<void> => {
    if (!vercelToken.trim()) {
      setVercelProjects([]);
      setVercelProjectsErrorMessage("Connect Vercel before loading projects.");
      return;
    }

    setIsLoadingVercelProjects(true);
    setVercelProjectsErrorMessage(null);
    try {
      const projects = await noraIntegrationClient.listVercelProjects(vercelToken);
      setVercelProjects(projects);
    } catch (error: unknown) {
      setVercelProjects([]);
      setVercelProjectsErrorMessage(error instanceof Error ? error.message : "Unable to load Vercel projects.");
    } finally {
      setIsLoadingVercelProjects(false);
    }
  }, [vercelToken]);

  const refreshVercelDeployments = useCallback(async (): Promise<void> => {
    if (!vercelToken.trim() || !linkedVercelProject) {
      setVercelDeployments([]);
      setVercelDeploymentsErrorMessage(null);
      return;
    }

    setIsLoadingVercelDeployments(true);
    setVercelDeploymentsErrorMessage(null);
    try {
      const deployments = await noraIntegrationClient.listVercelDeployments(
        vercelToken,
        linkedVercelProject.id,
        linkedVercelProject.teamId
      );
      setVercelDeployments(deployments);
    } catch (error: unknown) {
      setVercelDeployments([]);
      setVercelDeploymentsErrorMessage(error instanceof Error ? error.message : "Unable to load Vercel deployments.");
    } finally {
      setIsLoadingVercelDeployments(false);
    }
  }, [linkedVercelProject, vercelToken]);

  const refreshVercelRuntimeLogs = useCallback(async (): Promise<void> => {
    try {
      await startVercelRuntimeLogStream();
    } catch (error: unknown) {
      setIsLoadingVercelRuntimeLogs(false);
      setIsStreamingVercelRuntimeLogs(false);
      setVercelRuntimeLogs([]);
      setVercelRuntimeLogsErrorMessage(error instanceof Error ? error.message : "Unable to stream Vercel logs.");
    }
  }, [startVercelRuntimeLogStream]);

  const linkCurrentWorkspaceToVercelProject = useCallback((vercelProjectId: string): void => {
    if (!snapshot?.project) {
      return;
    }

    const project = vercelProjects.find((entry) => entry.id === vercelProjectId);
    if (!project) {
      return;
    }

    updateVercelWorkspaceLinks({
      ...vercelWorkspaceLinks,
      [snapshot.project.id]: {
        vercelProjectId: project.id,
        teamId: project.teamId
      }
    });
  }, [snapshot?.project, updateVercelWorkspaceLinks, vercelProjects, vercelWorkspaceLinks]);

  const unlinkCurrentWorkspaceFromVercelProject = useCallback((): void => {
    if (!snapshot?.project) {
      return;
    }

    activeVercelRuntimeLogDeploymentIdRef.current = null;
    void noraIntegrationClient.stopVercelRuntimeLogStream();
    const nextLinks = { ...vercelWorkspaceLinks };
    delete nextLinks[snapshot.project.id];
    updateVercelWorkspaceLinks(nextLinks);
    setVercelDeployments([]);
    setVercelRuntimeLogs([]);
    setIsStreamingVercelRuntimeLogs(false);
    setVercelDeploymentsErrorMessage(null);
    setVercelRuntimeLogsErrorMessage(null);
  }, [snapshot?.project, updateVercelWorkspaceLinks, vercelWorkspaceLinks]);

  const redeployVercelDeployment = useCallback(async (deployment: VercelDeploymentSummary): Promise<void> => {
    if (!vercelToken.trim() || !linkedVercelProject) {
      return;
    }

    setRedeployingVercelDeploymentId(deployment.id);
    setVercelDeploymentsErrorMessage(null);
    try {
      await noraIntegrationClient.redeployVercelDeployment(vercelToken, {
        deploymentId: deployment.id,
        vercelProjectId: linkedVercelProject.id,
        teamId: linkedVercelProject.teamId,
        target: deployment.target
      });
      await refreshVercelDeployments();
    } catch (error: unknown) {
      setVercelDeploymentsErrorMessage(error instanceof Error ? error.message : "Unable to redeploy Vercel deployment.");
    } finally {
      setRedeployingVercelDeploymentId(null);
    }
  }, [linkedVercelProject, refreshVercelDeployments, vercelToken]);

  return {
    vercelProjects,
    isLoadingVercelProjects,
    vercelProjectsErrorMessage,
    vercelDeployments,
    isLoadingVercelDeployments,
    vercelDeploymentsErrorMessage,
    vercelRuntimeLogs,
    isLoadingVercelRuntimeLogs,
    isStreamingVercelRuntimeLogs,
    vercelRuntimeLogsErrorMessage,
    redeployingVercelDeploymentId,
    linkedVercelProject,
    suggestedVercelProject,
    activeVercelLogDeployment,
    disconnectVercelAccount,
    refreshVercelProjects,
    refreshVercelDeployments,
    refreshVercelRuntimeLogs,
    linkCurrentWorkspaceToVercelProject,
    unlinkCurrentWorkspaceFromVercelProject,
    redeployVercelDeployment
  };
}

import type { MainServices } from "@main/services/mainServices";
import type {
  VercelDeploymentSummary,
  VercelProjectSummary,
  VercelRedeployPayload,
  VercelRuntimeLogStreamEvent,
  VercelRuntimeLogStreamRequest
} from "@shared/appTypes";
import { ipcMain } from "electron";

interface RegisterDeploymentIpcDeps {
  services: MainServices;
  notifyVercelRuntimeLogEvent: (payload: VercelRuntimeLogStreamEvent) => void;
}

export function registerDeploymentIpc({
  services,
  notifyVercelRuntimeLogEvent
}: RegisterDeploymentIpcDeps): void {
  ipcMain.handle("app:list-vercel-projects", (_event, token: string): Promise<VercelProjectSummary[]> =>
    services.deployment.listVercelProjects(token)
  );
  ipcMain.handle(
    "app:list-vercel-deployments",
    (_event, token: string, vercelProjectId: string, teamId?: string | null): Promise<VercelDeploymentSummary[]> =>
      services.deployment.listVercelDeployments(token, vercelProjectId, teamId)
  );
  ipcMain.handle(
    "app:redeploy-vercel-deployment",
    (_event, token: string, payload: VercelRedeployPayload): Promise<VercelDeploymentSummary> =>
      services.deployment.redeployVercelDeployment(token, payload)
  );
  ipcMain.handle(
    "app:start-vercel-runtime-log-stream",
    (_event, request: VercelRuntimeLogStreamRequest): Promise<void> =>
      services.deployment.startVercelRuntimeLogStream(request, {
        onConnected: () => {
          notifyVercelRuntimeLogEvent({
            type: "connected",
            deploymentId: request.deploymentId
          });
        },
        onEntry: (entry) => {
          notifyVercelRuntimeLogEvent({
            type: "entry",
            deploymentId: request.deploymentId,
            entry
          });
        },
        onError: (message) => {
          notifyVercelRuntimeLogEvent({
            type: "error",
            deploymentId: request.deploymentId,
            message
          });
        },
        onEnded: () => {
          notifyVercelRuntimeLogEvent({
            type: "ended",
            deploymentId: request.deploymentId
          });
        }
      })
  );
  ipcMain.handle("app:stop-vercel-runtime-log-stream", (): void => {
    services.deployment.stopVercelRuntimeLogStream();
  });
}

import type {
  VercelRedeployPayload,
  VercelRuntimeLogEntry,
  VercelRuntimeLogStreamRequest
} from "@shared/appTypes";
import type { MainServices } from "../services/mainServices";
import { createMainServices } from "../services/mainServices";
import {
  listAccessibleVercelProjects,
  listVercelProjectDeployments,
  redeployVercelDeploymentRequest,
  streamVercelRuntimeLogsForDeployment
} from "./vercel";

type ServicesBridgeDeps = {
  snapshot: MainServices["snapshot"];
  workspace: MainServices["workspace"];
  session: MainServices["session"];
  tooling: MainServices["tooling"];
  forge: MainServices["forge"];
  vercelApiTimeoutMs: number;
  getActiveVercelRuntimeLogStreamAbortController: () => AbortController | null;
  setActiveVercelRuntimeLogStreamAbortController: (controller: AbortController | null) => void;
};

export function createServicesBridge(deps: ServicesBridgeDeps): MainServices {
  return createMainServices({
    snapshot: deps.snapshot,
    workspace: deps.workspace,
    session: deps.session,
    tooling: deps.tooling,
    forge: deps.forge,
    deployment: {
      listVercelProjects: (token: string) => listAccessibleVercelProjects(token, deps.vercelApiTimeoutMs),
      listVercelDeployments: (token: string, vercelProjectId: string, teamId?: string | null) =>
        listVercelProjectDeployments(token, vercelProjectId, deps.vercelApiTimeoutMs, teamId),
      redeployVercelDeployment: (token: string, payload: VercelRedeployPayload) =>
        redeployVercelDeploymentRequest(token, payload),
      startVercelRuntimeLogStream: async (
        request: VercelRuntimeLogStreamRequest,
        listener: {
          onConnected: () => void;
          onEntry: (entry: VercelRuntimeLogEntry) => void;
          onError: (message: string) => void;
          onEnded: () => void;
        }
      ) => {
        const existingController = deps.getActiveVercelRuntimeLogStreamAbortController();
        deps.setActiveVercelRuntimeLogStreamAbortController(null);
        existingController?.abort();

        const controller = new AbortController();
        deps.setActiveVercelRuntimeLogStreamAbortController(controller);

        void streamVercelRuntimeLogsForDeployment(request, controller.signal, {
          onConnected: listener.onConnected,
          onEntry: listener.onEntry
        }).then(() => {
          if (deps.getActiveVercelRuntimeLogStreamAbortController() === controller) {
            deps.setActiveVercelRuntimeLogStreamAbortController(null);
          }
          listener.onEnded();
        }).catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          if (deps.getActiveVercelRuntimeLogStreamAbortController() === controller) {
            deps.setActiveVercelRuntimeLogStreamAbortController(null);
          }
          listener.onError(error instanceof Error ? error.message : "Unable to stream Vercel logs.");
        });
      },
      stopVercelRuntimeLogStream: () => {
        const controller = deps.getActiveVercelRuntimeLogStreamAbortController();
        deps.setActiveVercelRuntimeLogStreamAbortController(null);
        controller?.abort();
      }
    }
  });
}


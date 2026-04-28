import type { DeploymentService } from "../types/mainServices.types";

type DeploymentServiceDeps = DeploymentService;

export function createDeploymentService(deps: DeploymentServiceDeps): DeploymentService {
  return {
    listVercelProjects: deps.listVercelProjects,
    listVercelDeployments: deps.listVercelDeployments,
    redeployVercelDeployment: deps.redeployVercelDeployment,
    startVercelRuntimeLogStream: deps.startVercelRuntimeLogStream,
    stopVercelRuntimeLogStream: deps.stopVercelRuntimeLogStream
  };
}

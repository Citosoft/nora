import type { ActiveLocalPort, ActiveLocalPortSource } from "@/components/app/types/activeLocalPort.types";

/** Running terminals that exposed a local server, sorted by port then project name. */
export const collectActiveLocalPorts = (workspaces: ActiveLocalPortSource[]): ActiveLocalPort[] =>
  workspaces
    .flatMap((workspace) =>
      workspace.terminals.flatMap((terminal): ActiveLocalPort[] =>
        terminal.status === "running" && terminal.detectedLocalPort && terminal.detectedLocalUrl
          ? [
              {
                projectId: workspace.project.id,
                projectName: workspace.project.name,
                terminalId: terminal.id,
                terminalName: terminal.name,
                port: terminal.detectedLocalPort,
                url: terminal.detectedLocalUrl
              }
            ]
          : []
      )
    )
    .sort((left, right) => left.port - right.port || left.projectName.localeCompare(right.projectName));

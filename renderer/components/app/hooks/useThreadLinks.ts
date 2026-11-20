import { parseTaskLink } from "@shared/taskLink";
import { openTaskLink } from "@/components/app/logic/openTaskLink";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { useOptionalWorkspaceSidebarPorts } from "./useWorkspaceSidebarPorts";
import { useCallback } from "react";
import { useOptionalSessionCenterPorts } from "@/components/app/context/sessionCenterPortsContext";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { resolveThreadFileLink } from "@/components/app/logic/thread-workspace/fileLinks";

export function useThreadLinks(rootPath: string) {
  const openFileEditor = useOptionalSessionCenterPorts()?.centerContentBuild.openFileEditor;
  const workspacePorts = useOptionalWorkspaceSidebarPorts();
  return useCallback((href: string): void => {
    const taskLink = parseTaskLink(href);
    if (taskLink) {
      if (!workspacePorts) return;
      void openTaskLink(taskLink, {
        listTasks: noraWorkspaceClient.listWorkspaceTasks,
        openTaskEditor: workspacePorts.sidebarBuild.openTaskEditor
      }).catch(workspacePorts.onError);
      return;
    }
    const path = resolveThreadFileLink(rootPath, href);
    if (path) {
      void openFileEditor?.(path, { selectChange: false, rootPath });
    } else if (/^(https?:|mailto:)/i.test(href)) {
      void noraSystemClient.openExternalUrl(href);
    }
  }, [openFileEditor, rootPath, workspacePorts]);
}

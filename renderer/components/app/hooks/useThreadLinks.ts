import { useCallback } from "react";
import { useOptionalSessionCenterPorts } from "@/components/app/context/sessionCenterPortsContext";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { resolveThreadFileLink } from "@/components/app/logic/thread-workspace/fileLinks";

export function useThreadLinks(rootPath: string) {
  const openFileEditor = useOptionalSessionCenterPorts()?.centerContentBuild.openFileEditor;
  return useCallback((href: string): void => {
    const path = resolveThreadFileLink(rootPath, href);
    if (path) {
      void openFileEditor?.(path, { selectChange: false, rootPath });
    } else if (/^(https?:|mailto:)/i.test(href)) {
      void noraSystemClient.openExternalUrl(href);
    }
  }, [openFileEditor, rootPath]);
}

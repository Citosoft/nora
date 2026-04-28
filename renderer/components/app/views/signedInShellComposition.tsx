import { AppRootShellFrameProvider } from "@/components/app/context/appRootShellFrameContext";
import {
  AppChromeShellComposeProvider,
  AppShellLayoutProvider,
  SettingsRuntimeBuildProvider
} from "@/components/app/context/appShellBuildContexts";
import { ChromeShellPortsProvider } from "@/components/app/context/chromeShellPortsContext";
import { ChangesColumnPortsProvider } from "@/components/app/context/changesColumnPortsContext";
import { ModalClusterPortsProvider } from "@/components/app/context/modalClusterPortsContext";
import { SessionCenterPortsProvider } from "@/components/app/context/sessionCenterPortsContext";
import { WorkspaceSidebarPortsProvider } from "@/components/app/context/workspaceSidebarPortsContext";
import {
  buildChangesColumnPortsFromAssembly,
  buildChromeShellPorts,
  buildModalClusterPorts,
  buildSessionCenterPortsFromAssembly,
  buildWorkspaceSidebarPortsFromAssembly
} from "@/components/app/logic/buildSignedInRegionPortsFromAssembly";
import type { SignedInShellCompositionProps } from "@/components/app/types/signedInShellComposition.types";
import { useMemo, type ReactElement } from "react";

/**
 * Signed-in shell: settings + region port providers (memoized assembly slices), layout + frame.
 * Keeps `AppRoot` to snapshot/hook acquisition and a single `buildAppRootSignedInProviderSlices` call site.
 */
export const SignedInShellComposition = ({
  signedIn,
  shellFrameValue,
  children
}: SignedInShellCompositionProps): ReactElement => {
  const { signedInAssemblySources, modalDialogsBuild, settingsRuntimeBuild, chromeShellCompose, shellLayout } = signedIn;
  const a = signedInAssemblySources;

  const sessionCenterPorts = useMemo(
    () => buildSessionCenterPortsFromAssembly(a),
    [a.core, a.workspaceCatalog, a.workspaceContent, a.chromeShell, a.sessionSurface, a.centerTabs, a.forge, a.aiModels]
  );
  const changesColumnPorts = useMemo(
    () => buildChangesColumnPortsFromAssembly(a),
    [
      a.core,
      a.forge,
      a.forgeWorkItemMutators,
      a.vercel,
      a.gitBranches,
      a.sessionSurface,
      a.chromeShell,
      a.changesFileHandlers,
      a.modalExtras,
      a.workspaceContent
    ]
  );
  const modalClusterPorts = useMemo(() => buildModalClusterPorts(modalDialogsBuild), [modalDialogsBuild]);
  const workspaceSidebarPorts = useMemo(
    () => buildWorkspaceSidebarPortsFromAssembly(a),
    [a.core, a.workspaceCatalog, a.workspaceContent, a.workspaceSidebarRest, a.chromeShell, a.sessionSurface]
  );
  const chromeShellPorts = useMemo(
    () => buildChromeShellPorts(chromeShellCompose, a.chromeShell),
    [chromeShellCompose, a.chromeShell]
  );

  return (
    <SettingsRuntimeBuildProvider value={settingsRuntimeBuild}>
      <SessionCenterPortsProvider value={sessionCenterPorts}>
        <ChangesColumnPortsProvider value={changesColumnPorts}>
          <ModalClusterPortsProvider value={modalClusterPorts}>
            <WorkspaceSidebarPortsProvider value={workspaceSidebarPorts}>
              <ChromeShellPortsProvider value={chromeShellPorts}>
                <AppChromeShellComposeProvider value={chromeShellCompose}>
                  <AppShellLayoutProvider value={shellLayout}>
                    <AppRootShellFrameProvider value={shellFrameValue}>{children}</AppRootShellFrameProvider>
                  </AppShellLayoutProvider>
                </AppChromeShellComposeProvider>
              </ChromeShellPortsProvider>
            </WorkspaceSidebarPortsProvider>
          </ModalClusterPortsProvider>
        </ChangesColumnPortsProvider>
      </SessionCenterPortsProvider>
    </SettingsRuntimeBuildProvider>
  );
};

import { useAppRootState } from "@/components/app/context/appRootStateContext";
import type {
  ActiveRemoteMount,
  AgentSession,
  AppDomainState,
  AppState,
  GitDomainModel,
  ScriptsDomainModel,
  TerminalSession,
  ToolingDomainModel,
  WorkspaceDomainModel
} from "@shared/appTypes";

/** Canonical `AppState` from the same pipeline as {@link useAppDomainState} (null before first snapshot). */
export function useCanonicalAppSnapshot(): AppState | null {
  return useAppRootState().snapshot;
}

/** Full domain projection of the latest snapshot (compacted terminal streams, reconciled nesting). */
export function useAppDomainState(): AppDomainState {
  return useAppRootState().domainState;
}

export function useAppDomainNavigation(): AppDomainState["navigation"] {
  return useAppRootState().domainState.navigation;
}

export function useAppDomainSession(): AppDomainState["session"] {
  return useAppRootState().domainState.session;
}

export function useAppDomainFocus(): AppDomainState["focus"] {
  return useAppRootState().domainState.focus;
}

export function useAppDomainWorkspaceModel(): WorkspaceDomainModel {
  return useAppRootState().domainState.workspace;
}

export function useAppDomainGit(): GitDomainModel {
  return useAppRootState().domainState.git;
}

export function useAppDomainTooling(): ToolingDomainModel {
  return useAppRootState().domainState.tooling;
}

export function useAppDomainRemotes(): { activeRemoteMounts: ActiveRemoteMount[] } {
  return useAppRootState().domainState.remotes;
}

export function useAppDomainScripts(): ScriptsDomainModel {
  return useAppRootState().domainState.scripts;
}

export function useAppDomainAgents(): { list: AgentSession[] } {
  return useAppRootState().domainState.agents;
}

export function useAppDomainTerminals(): { list: TerminalSession[] } {
  return useAppRootState().domainState.terminals;
}

export function useAppDomainError(): { message: string | null } {
  return useAppRootState().domainState.error;
}

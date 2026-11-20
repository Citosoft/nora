import { useApps } from "@/components/app/hooks/useApps";
import { useNewAppDraft } from "@/components/app/hooks/useNewAppDraft";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import type { AppsHomeProps } from "@/components/app/types/appsView.types";
import { AppsHome } from "./AppsHome";
import { AppView } from "./AppView";

/** The center in Apps mode: the chosen app, or the home where a new one starts. */
export function AppsCenter() {
  const { apps, error } = useApps();
  const navigation = useWorkspaceNavigation();
  const activeAppId = navigation.preferences.activeAppId;
  const active = activeAppId && apps?.some((app) => app.id === activeAppId) ? activeAppId : null;
  if (active) return <AppView appId={active} />;
  return <AppsHomeSurface apps={apps ?? []} error={error} onOpen={(activeAppId) => navigation.setPreferences((current) => ({ ...current, activeAppId }))} />;
}

/** The home owns the new-app draft, so switching to an app and back starts the form afresh. */
function AppsHomeSurface({ apps, error, onOpen }: Omit<AppsHomeProps, "draft">) {
  const draft = useNewAppDraft();
  return <AppsHome apps={apps} error={error} onOpen={onOpen} draft={draft} />;
}

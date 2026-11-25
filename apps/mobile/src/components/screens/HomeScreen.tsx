import { useCallback, useMemo, useState } from "react";
import { RefreshControl } from "react-native";
import { router } from "expo-router";
import type { ComputerReport, ComputerReports } from "@/types/dashboard.types";
import { routes } from "@/navigation/routes";
import { dashboardHeadline, greeting, primaryRuntime, sameReport } from "@/state/dashboard";
import { useAppAccount } from "@/hooks/useAppAccount";
import { useNow } from "@/hooks/useNow";
import { useOpenDefaultRuntimeOnce } from "@/hooks/useOpenDefaultRuntimeOnce";
import { usePreferences } from "@/hooks/usePreferences";
import { useRuntimeDirectory } from "@/hooks/useRuntimeDirectory";
import { NavButton } from "@/components/common/NavButton";
import { Screen } from "@/components/common/Screen";
import { SectionHeader } from "@/components/common/SectionHeader";
import { StateView } from "@/components/common/StateView";
import { ComputerCard } from "@/components/dashboard/ComputerCard";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { PushPrompt } from "@/components/dashboard/PushPrompt";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DirectoryNotices } from "@/components/runtimes/DirectoryNotices";
import { InstallHint } from "@/components/runtimes/InstallHint";
import { SetupHelp } from "@/components/runtimes/SetupHelp";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";

const dateFormat: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

/** Where the app opens: a greeting with what needs you across every computer, shortcuts into the main one, and each computer's latest chats. */
export function HomeScreen() {
  const directory = useRuntimeDirectory();
  const account = useAppAccount();
  const { preferences, update } = usePreferences();
  const now = useNow();
  const [reports, setReports] = useState<ComputerReports>({});
  const view = directory.state.status === "ready" ? directory.state.value : null;
  useOpenDefaultRuntimeOnce(preferences.defaultRuntimeId, view?.runtimes ?? null);

  const runtimes = useMemo(() => (view ? [...view.runtimes].sort((left, right) =>
    Number(right.installationId === preferences.defaultRuntimeId) - Number(left.installationId === preferences.defaultRuntimeId)) : []),
  [preferences.defaultRuntimeId, view]);
  const primary = primaryRuntime(runtimes, preferences.defaultRuntimeId);
  const onReport = useCallback((installationId: string, report: ComputerReport) => {
    setReports((current) => (sameReport(current[installationId], report) ? current : { ...current, [installationId]: report }));
  }, []);
  // Only computers still linked count towards the headline.
  const linkedReports = Object.fromEntries(runtimes.flatMap((runtime) => {
    const report = reports[runtime.installationId];
    return report ? [[runtime.installationId, report]] : [];
  }));
  const headline = dashboardHeadline(linkedReports, view ? runtimes.length : null);
  const refreshing = directory.state.status === "ready" && directory.state.refreshing;

  return (
    <Screen title="Home"
      hero={<DashboardHero greeting={greeting(now, account.user?.fullName ?? null)} date={now.toLocaleDateString(undefined, dateFormat)} headline={headline} />}
      leading={<NavButton icon="settings-outline" label="Settings" onPress={() => router.push(routes.settings)} />}
      trailing={<NavButton icon="desktop-outline" label="Computers" onPress={() => router.push(routes.computers)} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void directory.refresh()} />}>
      {!preferences.installHintDismissed ? <InstallHint onDismiss={() => void update((current) => ({ ...current, installHintDismissed: true }))} /> : null}
      <PushPrompt dismissed={preferences.pushPromptDismissed} linkedComputers={runtimes.length}
        onDismiss={() => void update((current) => ({ ...current, pushPromptDismissed: true }))} />
      <DirectoryNotices directory={directory} now={now} />
      {primary ? <QuickActions runtime={primary} /> : null}
      {runtimes.length ? <SectionHeader title={runtimes.length === 1 ? "Your computer" : "Your computers"} /> : null}
      {runtimes.map((runtime) => (
        <ComputerCard key={runtime.installationId} runtime={runtime} isDefault={runtime.installationId === preferences.defaultRuntimeId} now={now} onReport={onReport} />
      ))}
      {view && runtimes.length === 0 ? (
        <>
          <StateView kind="empty" icon="desktop-outline" title="No computers yet" message={`Turn on ${NORA_RELAY_NAME} in Nora Desktop and your computer appears here.`} />
          <SetupHelp />
        </>
      ) : null}
    </Screen>
  );
}

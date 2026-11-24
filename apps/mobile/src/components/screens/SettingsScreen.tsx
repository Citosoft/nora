import { router } from "expo-router";
import { routes } from "@/navigation/routes";
import { NavButton } from "@/components/common/NavButton";
import { Screen } from "@/components/common/Screen";
import { SetupHelp } from "@/components/runtimes/SetupHelp";
import { ComputerSettingsLinks } from "@/components/settings/ComputerSettingsLinks";
import { AboutSection } from "@/components/settings/AboutSection";
import { AccountSection } from "@/components/settings/AccountSection";
import { DefaultRuntimePicker } from "@/components/settings/DefaultRuntimePicker";
import { InstallGuidance } from "@/components/settings/InstallGuidance";
import { PrivacyNotice } from "@/components/settings/PrivacyNotice";
import { SignOutSection } from "@/components/settings/SignOutSection";
import { ThemePicker } from "@/components/settings/ThemePicker";

const close = (): void => {
  if (router.canGoBack()) router.back();
  else router.replace(routes.home);
};

export function SettingsScreen() {
  return (
    <Screen title="Settings" largeTitle trailing={<NavButton label="Done" prominent onPress={close} />}>
      <AccountSection />
      <ComputerSettingsLinks />
      <DefaultRuntimePicker />
      <ThemePicker />
      <SetupHelp />
      <InstallGuidance />
      <PrivacyNotice />
      <AboutSection />
      <SignOutSection />
    </Screen>
  );
}

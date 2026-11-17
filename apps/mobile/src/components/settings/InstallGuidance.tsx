import { useState } from "react";
import { detectInstallContext } from "@/platform/installContext";
import { installInstructions } from "@/state/installInstructions";
import { useTheme } from "@/hooks/useTheme";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";

export function InstallGuidance() {
  const [context] = useState(detectInstallContext);
  const { colors } = useTheme();
  if (context.kind === "native") return null;
  return (
    <ListSection header="Home Screen" separatorInset={58}
      footer="The app opens faster and full-screen. Agents still run on your computer, not on your phone, and notifications aren't available yet.">
      <ListRow title={context.kind === "installed" ? "Nora is on your Home Screen" : installInstructions(context) ?? "Add Nora from your browser's menu."}
        titleLines={0} icon={{ icon: "add-circle", color: colors.tones.active.solid }} />
    </ListSection>
  );
}

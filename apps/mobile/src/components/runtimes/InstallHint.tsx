import { useState } from "react";
import { detectInstallContext } from "@/platform/installContext";
import { installInstructions } from "@/state/installInstructions";
import { Banner } from "@/components/common/Banner";
import { Button } from "@/components/common/Button";
import { Inset } from "@/components/common/Inset";

export function InstallHint({ onDismiss }: { onDismiss: () => void }) {
  const [context] = useState(detectInstallContext);
  const instructions = installInstructions(context);
  if (!instructions || context.kind === "desktop") return null;
  return (
    <Inset>
      <Banner tone="neutral" title="Add Nora to your Home Screen" message={instructions} action={<Button label="Not now" compact onPress={onDismiss} />} />
    </Inset>
  );
}

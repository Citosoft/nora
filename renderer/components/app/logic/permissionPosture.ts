import { ClipboardList, Eye, FilePen, Hand, ListChecks, Shield, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react";
import type { PermissionPosture, ProviderPolicy } from "@shared/types/provider/catalog.types";
import type { ComposerSettingChoice } from "@/components/app/types/modelPicker.types";

const postureIcons: Readonly<Record<PermissionPosture, LucideIcon>> = {
  ask: Hand,
  edits: FilePen,
  auto: ShieldCheck,
  plan: ClipboardList,
  readOnly: Eye,
  preapproved: ListChecks,
  full: ShieldAlert
};

/** Presents any provider's policies the same way; agents that report no posture (such as ACP session modes) get a plain shield. */
export function permissionChoices(policies: readonly ProviderPolicy[]): ComposerSettingChoice[] {
  return policies.map((policy) => ({ id: policy.id, label: policy.label, description: policy.description,
    icon: policy.posture ? postureIcons[policy.posture] : Shield, caution: policy.posture === "full" }));
}

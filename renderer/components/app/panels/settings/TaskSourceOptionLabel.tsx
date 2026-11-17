import { Cloud, HardDrive } from "lucide-react";
import { ProviderOptionLabel } from "./ProviderOptionLabel";
import type { TaskSourceOptionLabelProps } from "@/components/app/types/modelPicker.types";

export function TaskSourceOptionLabel({ source, label }: TaskSourceOptionLabelProps) {
  if (source === "codex" || source === "claude") return <ProviderOptionLabel kind={source} label={label} />;
  const Icon = source === "cloud" ? Cloud : HardDrive;
  return <span className="inline-flex min-w-0 items-center gap-2">
    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span className="truncate">{label}</span>
  </span>;
}

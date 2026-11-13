import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { ProviderOptionLabelProps } from "@/components/app/types/modelPicker.types";

export function ProviderOptionLabel({ kind, label }: ProviderOptionLabelProps) {
  return <span className="inline-flex min-w-0 items-center gap-2">
    <AgentToolIcon toolId={kind} label="" className="size-4 shrink-0" imageClassName="size-3.5" />
    <span className="truncate">{label}</span>
  </span>;
}

import type { AgentInfoRowProps } from "@/components/app/types/focusedAgentPanelParts.types";

export const AgentInfoRow = ({ icon: Icon, label, value }: AgentInfoRowProps) => (
  <div className="grid grid-cols-[20px_88px_minmax(0,1fr)] items-start gap-3">
    <Icon className="mt-0.5 size-4 text-primary" />
    <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
    <div className="min-w-0 break-words text-foreground">{value}</div>
  </div>
);

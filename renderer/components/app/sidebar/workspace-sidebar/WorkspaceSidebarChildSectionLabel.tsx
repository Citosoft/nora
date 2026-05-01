import type { ReactNode } from "react";

type WorkspaceSidebarChildSectionLabelProps = {
  icon: ReactNode;
  label: string;
};

export const WorkspaceSidebarChildSectionLabel = ({ icon, label }: WorkspaceSidebarChildSectionLabelProps) => (
  <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
    {icon}
    {label}
  </div>
);

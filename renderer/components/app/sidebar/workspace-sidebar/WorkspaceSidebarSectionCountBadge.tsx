type WorkspaceSidebarSectionCountBadgeProps = {
  count: number;
};

export const WorkspaceSidebarSectionCountBadge = ({ count }: WorkspaceSidebarSectionCountBadgeProps) => (
  <span className="absolute -right-2 -top-2 min-w-[0.85rem] rounded-full border border-primary/45 bg-primary/75 px-[3px] text-center text-[9px] font-semibold leading-[0.85rem] text-primary-foreground shadow-sm">
    {count}
  </span>
);

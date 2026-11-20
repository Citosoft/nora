export interface AppPanelMove {
  panelId: string;
  targetId: string;
  placement: "before" | "after";
}

export interface AppPanelLocation {
  parentId: string;
  index: number;
}

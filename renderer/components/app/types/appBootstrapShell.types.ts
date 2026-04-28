import type { StatusBarContextValue } from "@/components/app/logic/statusBarContext";
import type { ReactElement, ReactNode } from "react";

export type AppBootstrapShellProps = {
  statusBar: StatusBarContextValue;
  titleBar: ReactElement;
  topBanners: ReactElement;
  mainContent: ReactNode;
  footer: ReactElement;
};

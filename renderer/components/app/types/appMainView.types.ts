import type { ReactElement } from "react";

export type AppMainViewProps = {
  titleBar: ReactElement;
  topBanners: ReactElement;
  signedInWorkspaceView: ReactElement | null;
};

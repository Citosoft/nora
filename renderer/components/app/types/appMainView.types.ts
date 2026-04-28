import type { ReactElement } from "react";

export type AppMainViewProps = {
  titleBar: ReactElement;
  topBanners: ReactElement;
  showSettingsPage: boolean;
  settingsPage: ReactElement;
  signedInWorkspaceView: ReactElement | null;
  statusBar: ReactElement;
};

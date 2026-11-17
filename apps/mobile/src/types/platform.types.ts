/** Where the web app is running, for home-screen install guidance. */
export type InstallContext =
  | { kind: "native" }
  | { kind: "installed" }
  | { kind: "ios-safari" }
  | { kind: "ios-other-browser" }
  | { kind: "android" }
  | { kind: "desktop" };

export type ForegroundListener = () => void;
export type SubscribeToForeground = (listener: ForegroundListener) => () => void;

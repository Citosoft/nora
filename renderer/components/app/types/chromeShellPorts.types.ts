import type { AppChromeShellComposeSlice } from "@/components/app/types/appChromeShellComposeSlice.types";
import type { AppShellSignedInChromeShellSources } from "@/components/app/types/appShellSignedInAssemblySources.types";

/** Title bar, banners, status chrome — compose slice plus signed-in chrome assembly inputs. */
export type ChromeShellPorts = {
  compose: AppChromeShellComposeSlice;
  sources: AppShellSignedInChromeShellSources;
};

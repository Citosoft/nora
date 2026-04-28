import { assembleSignedInChromeShellComposeSlice } from "@/components/app/logic/assembleSignedInChromeShellComposeSlice";
import { assembleSignedInModalDialogsBuild } from "@/components/app/logic/assembleSignedInModalDialogsBuild";
import type { AppShellProviderSlicesResult } from "@/components/app/types/appShellProviderSliceAssembly.types";
import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";

type AssembledShellSlices = Pick<AppShellProviderSlicesResult, "modalDialogsBuild" | "chromeShellCompose">;

/**
 * Composes signed-in shell slices still supplied as dedicated provider payloads.
 * Center / workspace sidebar / changes section builds live on region ports (`buildSignedInRegionPortsFromAssembly`).
 */
export const assembleAppShellProviderSlices = (s: AppShellSignedInAssemblySources): AssembledShellSlices => ({
  modalDialogsBuild: assembleSignedInModalDialogsBuild(s),
  chromeShellCompose: assembleSignedInChromeShellComposeSlice(s)
});

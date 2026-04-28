import { buildAppRootSignedInProviderSlices } from "@/components/app/logic/buildAppRootSignedInProviderSlices";
import { buildAppRootSignedInProviderSlicesDeps } from "@/components/app/logic/buildAppRootSignedInProviderSlicesDeps";
import type { AppRootSignedInProviderSlicesWiringInput } from "@/components/app/types/appRootSignedInProviderSlicesWiring.types";
import type { BuildAppRootSignedInProviderSlicesResult } from "@/components/app/types/buildAppRootSignedInProviderSlices.types";

export const assembleSignedInProviderSlicesFromWiringInput = (
  wiring: AppRootSignedInProviderSlicesWiringInput
): BuildAppRootSignedInProviderSlicesResult =>
  buildAppRootSignedInProviderSlices(buildAppRootSignedInProviderSlicesDeps(wiring));

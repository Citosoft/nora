import { assembleSignedInProviderSlicesFromWiringInput } from "@/components/app/logic/assembleSignedInProviderSlicesFromWiringInput";
import type { AppRootSignedInProviderSlicesWiringInput } from "@/components/app/types/appRootSignedInProviderSlicesWiring.types";
import type { BuildAppRootSignedInProviderSlicesResult } from "@/components/app/types/buildAppRootSignedInProviderSlices.types";
import { useMemo } from "react";

/**
 * Memoized signed-in shell provider slices from stable wiring input.
 * Pass `null` when pre-launch or unsigned snapshot so assembly is skipped.
 */
export const useAppRootSignedInProviderSlices = (
  wiring: AppRootSignedInProviderSlicesWiringInput | null
): BuildAppRootSignedInProviderSlicesResult | null =>
  useMemo(() => (wiring ? assembleSignedInProviderSlicesFromWiringInput(wiring) : null), [wiring]);

import type { AppRootShellFrameValue } from "@/components/app/types/appRootShellFrame.types";
import type { BuildAppRootSignedInProviderSlicesResult } from "@/components/app/types/buildAppRootSignedInProviderSlices.types";
import type { ReactNode } from "react";

export type SignedInShellCompositionProps = {
  signedIn: BuildAppRootSignedInProviderSlicesResult;
  shellFrameValue: AppRootShellFrameValue;
  children: ReactNode;
};

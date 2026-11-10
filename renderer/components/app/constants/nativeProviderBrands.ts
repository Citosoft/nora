import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { AiProvider } from "@shared/appTypes";

export const nativeProviderBrands: Readonly<Record<NativeProvider["kind"], AiProvider>> = {
  codex: "openai",
  claude: "anthropic"
};

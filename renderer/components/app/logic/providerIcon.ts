import type { ProviderConnectionKind } from "@shared/types/provider/account.types";
import type { ProviderIconPresentation } from "@/components/app/types/providerIcon.types";

export function providerIconPresentation(toolId: string, label: string, connection: ProviderConnectionKind): ProviderIconPresentation {
  if (toolId !== "claude") return { variant: "provider", label };
  switch (connection) {
    case "subscription": return { variant: "claude-subscription", label: "Claude subscription" };
    case "api": return { variant: "claude-api", label: "Claude Console / API" };
    case "unknown": return { variant: "claude-unknown", label: "Claude — connection type unavailable" };
  }
}


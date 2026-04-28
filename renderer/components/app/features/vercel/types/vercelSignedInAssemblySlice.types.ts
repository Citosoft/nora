import type { UseVercelIntegrationResult } from "@/components/app/types/appHooks.types";

export type VercelSignedInAssemblySliceInput = {
  integration: UseVercelIntegrationResult;
  vercelAccountLabel: string | null;
  vercelToken: string;
};

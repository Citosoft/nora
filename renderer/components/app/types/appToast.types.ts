import type { DevToastVariant } from "@/components/app/types/settings.types";

export type AppToast = {
  id: number;
  title: string;
  description?: string;
  variant: DevToastVariant;
};

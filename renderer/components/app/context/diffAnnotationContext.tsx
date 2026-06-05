import { useDiffAnnotationsState } from "@/components/app/hooks/useDiffAnnotationsState";
import type { DiffAnnotationContextValue } from "@/components/app/types/diffAnnotationContext.types";
import { createContext, useContext, type ReactElement, type ReactNode } from "react";

const DiffAnnotationContext = createContext<DiffAnnotationContextValue | null>(null);

export function DiffAnnotationProvider({ children }: { children: ReactNode }): ReactElement {
  const value = useDiffAnnotationsState();
  return <DiffAnnotationContext.Provider value={value}>{children}</DiffAnnotationContext.Provider>;
}

export function useDiffAnnotations(): DiffAnnotationContextValue {
  const value = useContext(DiffAnnotationContext);
  if (!value) {
    throw new Error("useDiffAnnotations must be used within a DiffAnnotationProvider.");
  }
  return value;
}

export function useOptionalDiffAnnotations(): DiffAnnotationContextValue | null {
  return useContext(DiffAnnotationContext);
}

import type { ReactNode } from "react";

export interface AppCrashDetails {
  message: string;
  stack: string | null;
  componentStack: string | null;
}

export interface AppErrorBoundaryProps {
  children: ReactNode;
}

export interface AppErrorBoundaryState {
  crash: AppCrashDetails | null;
}

export interface AppCrashFallbackProps {
  crash: AppCrashDetails;
  onReload: () => void;
}

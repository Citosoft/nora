import { toAppCrashDetails } from "@/components/app/logic/appCrashReport";
import type { AppErrorBoundaryProps, AppErrorBoundaryState } from "@/components/app/types/appErrorBoundary.types";
import { AppCrashFallback } from "@/components/app/views/AppCrashFallback";
import { Component, type ErrorInfo } from "react";

/** Top-level boundary so a render error shows a recoverable screen instead of a blank window. */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { crash: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { crash: toAppCrashDetails(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("Nora renderer crashed.", error, info.componentStack);
    this.setState({ crash: toAppCrashDetails(error, info.componentStack ?? null) });
  }

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.crash) {
      return <AppCrashFallback crash={this.state.crash} onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}

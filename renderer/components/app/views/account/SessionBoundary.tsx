import { Component } from "react";
import type { SessionBoundaryProps, SessionBoundaryState } from "@/components/app/types/accountProvider.types";

/** Account services must never prevent local workspace use. */
export class SessionBoundary extends Component<SessionBoundaryProps, SessionBoundaryState> {
  state: SessionBoundaryState = { failed: false };
  static getDerivedStateFromError(): SessionBoundaryState { return { failed: true }; }
  componentDidCatch(): void {
    void window.noraAccount.publish({ status: "error", message: "Account services are unavailable." }).catch(() => undefined);
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

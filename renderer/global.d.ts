import type { NoraBridge } from "@shared/ipc/types/noraBridge.types";
import type * as React from "react";

declare global {
  const __NORA_IS_PRODUCTION__: boolean;
  const __NORA_POSTHOG_API_KEY__: string;
  const __NORA_POSTHOG_HOST__: string;
  const __VITE_PUBLIC_POSTHOG_PROJECT_TOKEN__: string;
  const __VITE_PUBLIC_POSTHOG_HOST__: string;
  const __NPM_PACKAGE_VERSION__: string;

  interface Window {
    nora: NoraBridge;
  }

  interface ElectronDidNavigateEvent extends Event {
    url: string;
    isMainFrame: boolean;
  }

  interface ElectronPageTitleUpdatedEvent extends Event {
    title: string;
    explicitSet: boolean;
  }

  interface ElectronDidFailLoadEvent extends Event {
    errorCode: number;
    errorDescription: string;
    validatedURL: string;
    isMainFrame: boolean;
  }

  interface ElectronWebviewElement extends HTMLElement {
    src: string;
    canGoBack(): boolean;
    canGoForward(): boolean;
    goBack(): void;
    goForward(): void;
    reload(): void;
    stop(): void;
    openDevTools(): void;
    getURL(): string;
    addEventListener(
      type: "did-start-loading" | "did-stop-loading",
      listener: (event: Event) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: "did-navigate" | "did-navigate-in-page",
      listener: (event: ElectronDidNavigateEvent) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: "page-title-updated",
      listener: (event: ElectronPageTitleUpdatedEvent) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: "did-fail-load",
      listener: (event: ElectronDidFailLoadEvent) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: "did-start-loading" | "did-stop-loading",
      listener: (event: Event) => void,
      options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
      type: "did-navigate" | "did-navigate-in-page",
      listener: (event: ElectronDidNavigateEvent) => void,
      options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
      type: "page-title-updated",
      listener: (event: ElectronPageTitleUpdatedEvent) => void,
      options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
      type: "did-fail-load",
      listener: (event: ElectronDidFailLoadEvent) => void,
      options?: boolean | EventListenerOptions
    ): void;
  }

  interface HTMLWebViewElement extends ElectronWebviewElement {}

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<ElectronWebviewElement>, ElectronWebviewElement> & {
        src?: string;
        partition?: string;
        allowpopups?: string;
        webpreferences?: string;
      };
    }
  }
}

export { };

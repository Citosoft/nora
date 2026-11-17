import { App } from "@/App";
import { AppErrorBoundary } from "@/components/app/views/AppErrorBoundary";
import { AccountProvider } from "@/components/app/views/account/AccountProvider";
import type { AccountConfig } from "@shared/types/account/account.types";
import { PostHogProvider } from "@posthog/react";
import "@xterm/xterm/css/xterm.css";
import posthog from "posthog-js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const posthogToken =
  __NORA_POSTHOG_API_KEY__?.trim() ||
  __VITE_PUBLIC_POSTHOG_PROJECT_TOKEN__?.trim() ||
  "";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Missing #app root");
}

const root = createRoot(rootElement);
const render = (config: AccountConfig): void => root.render(
  <StrictMode>
    <AppErrorBoundary>
      <AccountProvider config={config}>
      {posthogToken ? (
        <PostHogProvider client={posthog}>
          <App />
        </PostHogProvider>
      ) : (
        <App />
      )}
      </AccountProvider>
    </AppErrorBoundary>
  </StrictMode>
);
void window.noraAccount.config().then(render).catch(() => render({ publishableKey: "" }));

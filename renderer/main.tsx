import { App } from "@/App";
import { AppErrorBoundary } from "@/components/app/views/AppErrorBoundary";
import { AccountProvider } from "@/components/app/views/account/AccountProvider";
import type { AccountConfig } from "@shared/types/account/account.types";
import { observeWindowErrors } from "@/lib/analytics";
import "@xterm/xterm/css/xterm.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Missing #app root");
}

observeWindowErrors();
const root = createRoot(rootElement);
const render = (config: AccountConfig): void => root.render(
  <StrictMode>
    <AppErrorBoundary>
      <AccountProvider config={config}>
        <App />
      </AccountProvider>
    </AppErrorBoundary>
  </StrictMode>
);
void window.noraAccount.config().then(render).catch(() => render({ publishableKey: "" }));

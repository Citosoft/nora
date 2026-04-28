import { App } from "@/App";
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

createRoot(rootElement).render(
  <StrictMode>
    {posthogToken ? (
      <PostHogProvider client={posthog}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);

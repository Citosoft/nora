import type { PushNotificationsPresentation, PushPromptInput, PushRegistrationStatus } from "@/types/pushNotifications.types";

const DEFAULT_FOOTER = "Get a notification when a thread finishes or something on your computer needs you. Tap it to open that thread.";

/** What the Notifications setting shows for the current registration state. */
export function presentPushStatus(enabled: boolean, status: PushRegistrationStatus): PushNotificationsPresentation {
  switch (status.kind) {
    case "denied":
      return { on: false, footer: "Notifications are turned off for Nora in your phone's settings. Allow them there, then turn this on.", openSettings: true };
    case "permission-needed":
      return { on: false, footer: DEFAULT_FOOTER, openSettings: false };
    case "failed":
      return { on: enabled, footer: `Couldn't register this phone: ${status.message}`, openSettings: false };
    case "registered":
      return { on: enabled, footer: DEFAULT_FOOTER, openSettings: false };
    case "off":
    case "unsupported":
      return { on: false, footer: DEFAULT_FOOTER, openSettings: false };
  }
}

/**
 * Whether the home screen offers notifications: once a computer is linked (so there is something to hear from), while
 * they are off and the OS prompt can still be shown. A refused permission is left to Settings, which explains how to fix it.
 */
export function shouldOfferPushPrompt(input: PushPromptInput): boolean {
  if (!input.supported || input.enabled || input.dismissed || input.linkedComputers === 0) return false;
  return input.status.kind === "off" || input.status.kind === "permission-needed";
}

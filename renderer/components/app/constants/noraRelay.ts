import type { NoraRelayStep } from "@/components/app/types/remoteAccess.types";

/** How Nora Relay links a phone to this computer, step by step; numbers match the badges in the diagram. */
export const NORA_RELAY_STEPS: readonly NoraRelayStep[] = [
  { title: "This computer registers", body: "Turning on Nora Relay adds this computer to its directory under your account." },
  { title: "A tunnel opens outward", body: "A Cloudflare connector on this computer dials out to Cloudflare. No ports are opened on your network." },
  { title: "Your phone finds it", body: "Sign in on your phone with the same Nora account and the app lists the computers that are yours." },
  { title: "Requests come home", body: "Messages and approvals travel over HTTPS through Cloudflare and the tunnel. Nora checks your account on every request. Your threads and code stay on this computer." }
];

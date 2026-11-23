import type { NoraConnectStep } from "@/components/app/types/remoteAccess.types";

/** Nora Connect is the name for what makes remote access work: the account directory, the Cloudflare tunnel and the apps at each end. */
export const NORA_CONNECT_NAME = "Nora Connect";

export const NORA_CONNECT_STEPS: readonly NoraConnectStep[] = [
  { title: "This computer registers", body: "Turning on remote access adds this computer to the Nora Connect directory under your account." },
  { title: "A tunnel opens outward", body: "A Cloudflare connector on this computer dials out to Cloudflare. No ports are opened on your network." },
  { title: "Your phone finds it", body: "Sign in on your phone with the same Nora account and the app lists the computers that are yours." },
  { title: "Requests come home", body: "Messages and approvals travel over HTTPS through Cloudflare and the tunnel. Nora checks your account on every request. Your threads and code stay on this computer." }
];

import type { MobileRemoteDemoBot, MobileRemoteDemoScene } from "@/components/app/types/remoteAccess.types";

/** The moments the Mobile page's phone plays through, in order; each doubles as a feature in the list beside it. */
export const MOBILE_REMOTE_DEMO_SCENES: readonly MobileRemoteDemoScene[] = [
  { id: "threads", title: "Check on every thread", description: "See what is running, what is done and what is waiting on you." },
  { id: "bots", title: "Talk to your bots", description: "See which bots are busy and message any of them directly." },
  { id: "approve", title: "Approve from anywhere", description: "Answer approvals and questions so agents never sit idle." },
  { id: "message", title: "Send new instructions", description: "Reply to a thread or start a new one with a few taps." },
  { id: "notify", title: "Know when work lands", description: "Get told the moment a task finishes or needs you." }
];

/** Sample bots for the demo's Bots screen, one in each state worth showing. */
export const MOBILE_REMOTE_DEMO_BOTS: readonly MobileRemoteDemoBot[] = [
  { name: "Ada", role: "Code reviewer", status: "Reviewing PR #131", avatar: { seed: 1201, shape: "squircle", palette: "violet", eyes: "oval" }, state: "thinking" },
  { name: "Rex", role: "Release manager", status: "Waiting for you", avatar: { seed: 3307, shape: "shield", palette: "amber", eyes: "dot" }, state: "waiting" },
  { name: "Moss", role: "Researcher", status: "Writing a summary", avatar: { seed: 5519, shape: "leaf", palette: "green", eyes: "pupil" }, state: "speaking" },
  { name: "Juno", role: "Designer", status: "Free", avatar: { seed: 7723, shape: "flower", palette: "pink", eyes: "dot" }, state: "idle" }
];

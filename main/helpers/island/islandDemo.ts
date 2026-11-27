import type { ActiveWorkCount, ActiveWorkItem } from "@main/types/desktop-lifecycle/desktopLifecycle.types";
import type { IslandDemoScenario } from "@shared/types/island/island.types";

const DEMO_ID_PREFIX = "island-demo-";

const demoItem = (id: string, minutesAgo: number, item: Omit<ActiveWorkItem, "target" | "kind" | "activeAt">): ActiveWorkItem => ({
  kind: "thread", ...item, activeAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  target: { kind: "thread", conversationId: `${DEMO_ID_PREFIX}${id}` }
});

/**
 * Sample work with bot faces and provider icons. "running" has nothing waiting on the user, so the most recent
 * running thread leads; "needs-you" adds a thread awaiting approval, which leads instead.
 */
export function islandDemoWork(scenario: IslandDemoScenario): ActiveWorkCount {
  const needsYou: ActiveWorkItem[] = scenario === "needs-you" ? [
    demoItem("review", 1, { title: "Review the release notes", workspace: "/demo/nora", status: "Waiting for approval", phase: "waiting",
      identity: { kind: "bot", name: "Reviewer", avatar: { seed: 4242 } } })
  ] : [];
  const items: ActiveWorkItem[] = [
    ...needsYou,
    demoItem("tests", 0, { title: "Fix the flaky sync tests", workspace: "/demo/nora", status: "Running", phase: "running",
      identity: { kind: "provider", toolId: "claude", label: "Claude Code", connection: "subscription" } }),
    demoItem("docs", 3, { title: "Write the onboarding guide", workspace: "/demo/website", status: "Running, 1 queued", phase: "running",
      identity: { kind: "bot", name: "Writer", avatar: { seed: 1717 } } }),
    demoItem("deps", 6, { title: "Update dependencies", workspace: "/demo/api", status: "Queued", phase: "queued",
      identity: { kind: "provider", toolId: "codex", label: "Codex", connection: "unknown" } })
  ];
  return { items, conversations: items.length, agents: 0, total: items.length };
}

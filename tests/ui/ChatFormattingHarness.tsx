import { createRoot } from "react-dom/client";
import { useState } from "react";
import { resolveThreadFileLink } from "@/components/app/logic/thread-workspace/fileLinks";
import { NativeTimeline } from "@/components/app/panels/conversations/NativeTimeline";
import { simulatedMarkdown } from "../simulator/markdown";
import { simulatedFileChanges } from "../simulator/fileChanges";

export function ChatFormattingHarness() {
  const [openedFile, setOpenedFile] = useState<string | null>(null);
  return <main className="h-screen overflow-auto bg-background p-5 text-foreground"><div className="mx-auto max-w-[800px]">
    <output aria-label="Opened file">{openedFile}</output>
    <NativeTimeline items={[
      { kind: "message", id: "markdown", runId: "run", createdAt: "2026-11-10T10:00:00.000Z", role: "assistant", text: simulatedMarkdown, complete: true },
      { kind: "message", id: "links", runId: "run", createdAt: "2026-11-10T10:00:01.000Z", role: "assistant",
        text: "[Relative file](src/app.ts) · [Absolute file](/repo/docs/guide.md:12) · [File URL](file:///repo/README.md)", complete: true },
      { kind: "review", id: "review", runId: "run", createdAt: "2026-11-10T10:01:00.000Z", result: { status: "ready", scope: "turn", attribution: "observed",
        baselineAt: "2026-11-10T10:00:00.000Z", capturedAt: "2026-11-10T10:01:00.000Z",
        changes: [...simulatedFileChanges, { ...simulatedFileChanges[0], path: "renderer/components/app/panels/conversations/NativeTimeline.tsx" },
          { ...simulatedFileChanges[1], path: "changelogs/v0.2.3.md" }] } }
    ]} onLinkClick={(href) => setOpenedFile(resolveThreadFileLink("/repo", href))} />
  </div></main>;
}
const root = document.getElementById("app");
if (!root) throw new Error("Chat formatting root is missing");
createRoot(root).render(<ChatFormattingHarness />);

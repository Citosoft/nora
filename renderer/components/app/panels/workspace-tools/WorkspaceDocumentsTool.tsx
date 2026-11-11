import { useState } from "react";
import { NoteCenter } from "@/components/app/notes/NoteCenter";
import { SpecCenter } from "@/components/app/specs/SpecCenter";
import { Button } from "@/components/ui/button";

export function WorkspaceDocumentsTool() {
  const [filter, setFilter] = useState<"notes" | "specs">("notes");
  return <div className="flex h-full min-h-0 flex-col">
    <nav aria-label="Document kind" className="flex gap-2 border-b border-border/60 px-5 py-2">
      <Button size="sm" variant={filter === "notes" ? "secondary" : "ghost"} aria-pressed={filter === "notes"} onClick={() => setFilter("notes")}>Notes</Button>
      <Button size="sm" variant={filter === "specs" ? "secondary" : "ghost"} aria-pressed={filter === "specs"} onClick={() => setFilter("specs")}>Specs</Button>
    </nav>
    <div className="min-h-0 flex-1">{filter === "notes" ? <NoteCenter /> : <SpecCenter />}</div>
  </div>;
}

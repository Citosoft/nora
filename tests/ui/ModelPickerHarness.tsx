import { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { NativeProviderPicker } from "@/components/app/panels/conversations/NativeProviderPicker";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import { pickerCatalog, pickerWorkspace, codexProvider, claudeProvider } from "../unit/renderer/modelPickerFixtures";

const workspace = { id: "personal", name: "Personal", kind: "personal" as const, workspace: pickerWorkspace };
const state: NativeBoot = { environmentId: "local", cursor: 0, personalization: { defaultRole: { id: "general" }, workspaceRoles: {} },
  workspaces: [workspace], providers: [codexProvider, claudeProvider] };

/** Component-only acceptance host. It is neither an application shell nor a live provider integration. */
export function ModelPickerHarness() {
  const [binding, setBinding] = useState<ProviderBinding | null>(null);
  const [locked, setLocked] = useState<ProviderBinding | null>(null);
  const [draft, setDraft] = useState("A draft that must survive model selection");
  const scenario = useRef("ready");
  const client = useMemo<ConversationClient>(() => ({
    async externalSessions() { return { status: "available", sessions: [] }; },
    async context() { return null; },
    async catalog(kind, instanceId) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      if (scenario.current === "error") throw new Error("Private failure details");
      const result = pickerCatalog({ kind, instanceId, label: kind });
      result.catalog.models = result.catalog.models.map((model) => ({ ...model, name: `${kind === "codex" ? "Codex" : "Claude"} ${model.id === "first" ? "Alpha" : "Beta"}` }));
      if (scenario.current === "empty") result.catalog.models = [];
      if (scenario.current === "auth") result.catalog.authentication = "required";
      if (scenario.current === "reorder") { result.catalog.models.reverse(); result.catalog.policies.reverse(); }
      return result;
    },
    async execute() { throw new Error("No inference is permitted in this fixture"); },
    async header() { return null; }, async summaries() { return []; },
    async mcp() { return { kind: "unavailable", message: "No MCP in this fixture" }; },
    async skills() { return { kind: "unavailable", message: "No skills in this fixture" }; },
    async history() { throw new Error("No conversation history in this fixture"); }, subscribe() { return () => {}; }
  }), []);
  return <main className="mx-auto max-w-3xl px-4 py-8">
    <div className="rounded-xl border bg-card p-4" style={{ marginTop: 320 }}>
      <label htmlFor="picker-draft" className="sr-only">Thread draft</label><textarea id="picker-draft" value={draft} onChange={(event) => setDraft(event.target.value)} className="mb-3 min-h-20 w-full bg-transparent text-sm" />
      <NativeProviderPicker state={state} workspace={workspace} client={client} locked={locked} initial={null} onBinding={setBinding} />
    </div>
    <section className="mt-8 space-y-3 text-sm" aria-label="Acceptance controls">
      <label>Catalog scenario <select id="picker-scenario" defaultValue="ready" onChange={(event) => { scenario.current = event.target.value; }}>
        {['ready', 'error', 'empty', 'auth', 'reorder'].map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <button id="picker-lock" type="button" onClick={() => setLocked(binding)}>Lock saved binding</button>
      <pre id="picker-binding">{JSON.stringify(binding)}</pre>
    </section>
  </main>;
}

const root = document.getElementById("app");
if (!root) throw new Error("Model picker acceptance root is missing");
createRoot(root).render(<ModelPickerHarness />);

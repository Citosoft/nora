import { describe, expect, it } from "vitest";
import { selectModel } from "@/state/providerPicker";
import { demoProviderOptions } from "@/demo/providerOptions";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";

const result = demoProviderOptions.providers[0]!.result;
if (result.status !== "available") throw new Error("Expected demo catalog");
const catalog: ProviderCatalog = { ...result.catalog, capabilities: { ...result.catalog.capabilities, subagentModel: true },
  models: [...result.catalog.models, { id: "fast", name: "Fast", description: "", reasoningEfforts: ["low"], defaultReasoningEffort: "low" }] };

describe("model selection", () => {
  it("preserves compatible permissions and reasoning on the same provider", () => {
    const previous = { ...demoProviderOptions.defaultBinding!, permissionPolicy: "full", reasoning: "low", subagentModel: "fast" };
    expect(selectModel(catalog, "fast", previous)).toMatchObject({ permissionPolicy: "full", reasoning: "low", subagentModel: "fast" });
    expect(selectModel(catalog, "fast", { ...previous, reasoning: null }).reasoning).toBeNull();
  });

  it("resets incompatible reasoning to the new model default", () => {
    expect(selectModel(catalog, "fast", { ...demoProviderOptions.defaultBinding!, reasoning: "high" }).reasoning).toBe("low");
    expect(selectModel({ ...catalog, capabilities: { ...catalog.capabilities, reasoning: false } }, "fast", null).reasoning).toBeNull();
  });

  it("does not carry permissions or subagent settings across providers", () => {
    const previous = { ...demoProviderOptions.defaultBinding!, instanceId: "another-account", permissionPolicy: "full", subagentModel: "fast" };
    expect(selectModel(catalog, "fast", previous)).toMatchObject({ instanceId: catalog.instanceId, permissionPolicy: "ask", reasoning: "low" });
    expect(selectModel(catalog, "fast", previous).subagentModel).toBeUndefined();
  });
});

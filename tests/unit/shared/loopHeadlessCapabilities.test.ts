import { AGENT_DEFINITIONS } from "@main/agentCatalog";
import {
  LOOP_HEADLESS_TOOL_CAPABILITIES,
  LOOP_HEADLESS_UNSUPPORTED_TOOL_IDS,
  canRunLoopHeadless,
  listLoopHeadlessCapableToolIds
} from "@shared/loopHeadlessCapabilities";
import assert from "node:assert/strict";
import test from "node:test";

test("every catalog agent is either headless-capable or explicitly unsupported", () => {
  const catalogIds = AGENT_DEFINITIONS.map((definition) => definition.id);
  const supportedIds = new Set(listLoopHeadlessCapableToolIds());
  const unsupportedIds = new Set<string>(LOOP_HEADLESS_UNSUPPORTED_TOOL_IDS);

  assert.equal(catalogIds.length, supportedIds.size + unsupportedIds.size);

  for (const id of catalogIds) {
    const supported = supportedIds.has(id);
    const unsupported = unsupportedIds.has(id);
    assert.equal(supported || unsupported, true, `${id} must be supported or explicitly unsupported`);
    assert.notEqual(supported && unsupported, true, `${id} cannot be both supported and unsupported`);
  }
});

test("loop headless capabilities stay aligned with canRunLoopHeadless", () => {
  for (const entry of LOOP_HEADLESS_TOOL_CAPABILITIES) {
    assert.equal(canRunLoopHeadless(entry.toolId), true);
  }
  for (const toolId of LOOP_HEADLESS_UNSUPPORTED_TOOL_IDS) {
    assert.equal(canRunLoopHeadless(toolId), false);
  }
});

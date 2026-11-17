import assert from "node:assert/strict";
import test from "node:test";
import { uniqueServerName } from "@main/connectors/serverName";
import { connectorServerNameSchema } from "@shared/connectors/contracts";

test("server names are slugs every runtime accepts, unique and never Nora's own", () => {
  assert.equal(uniqueServerName("Linear (work)", new Set()), "linear_work");
  assert.equal(uniqueServerName("Linear", new Set(["linear"])), "linear_2");
  assert.equal(uniqueServerName("Linear", new Set(["linear", "linear_2"])), "linear_3");
  assert.equal(uniqueServerName("Nora", new Set()), "nora_2");
  assert.equal(uniqueServerName("✨", new Set()), "connector");
  assert.equal(uniqueServerName("Café Notes", new Set()), "cafe_notes");
  for (const name of ["Linear (work)", "x".repeat(100), "Nora"]) assert.ok(connectorServerNameSchema.safeParse(uniqueServerName(name, new Set())).success);
});

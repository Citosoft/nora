import assert from "node:assert/strict";
import test from "node:test";
import { compileSelect, selectRows, toolResultInput } from "@main/apps/selectRows";
import { APP_SOURCE_ROW_LIMIT } from "@shared/apps/contracts";

test("a tool result is read as structured content, parsed JSON text, or plain text", () => {
  assert.deepEqual(toolResultInput({ content: [{ type: "text", text: "ignored" }], structuredContent: { items: [1] } }), { items: [1] });
  assert.deepEqual(toolResultInput({ content: [{ type: "text", text: "{\"a\":1}" }] }), { a: 1 });
  assert.equal(toolResultInput({ content: [{ type: "text", text: "plain" }] }), "plain");
  assert.deepEqual(toolResultInput({ content: [{ type: "text", text: "[1]" }, { type: "text", text: "x" }] }), [[1], "x"]);
});

test("select shapes rows with JSONata and bounds them", async () => {
  const shaped = await selectRows("results[].{\"name\": name, \"amount\": $number(total)}", { results: [{ name: "a", total: "1.5" }, { name: "b", total: 2 }] });
  assert.deepEqual(shaped, { rows: [{ name: "a", amount: 1.5 }, { name: "b", amount: 2 }], truncated: false });
  const many = await selectRows("$", Array.from({ length: APP_SOURCE_ROW_LIMIT + 5 }, (_entry, index) => index));
  assert.equal((many.rows as number[]).length, APP_SOURCE_ROW_LIMIT);
  assert.equal(many.truncated, true);
  assert.deepEqual(await selectRows("missing", { a: 1 }), { rows: null, truncated: false });
});

test("broken expressions fail with messages the agent can act on", async () => {
  assert.throws(() => compileSelect("results["), /could not be parsed/);
  await assert.rejects(compileSelect("$sum(x)").evaluate({ x: "nope" }), /select expression failed/);
});

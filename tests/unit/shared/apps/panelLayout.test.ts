import assert from "node:assert/strict";
import test from "node:test";
import { adjacentAppPanelMove, appPanelLocations, moveAppPanel } from "@shared/apps/panelLayout";
import type { AppUiSpec } from "@shared/types/apps/apps.types";
import { panelLayoutRenderSpec, PANEL_ID_PROP } from "@/components/app/logic/apps/panelLayout";

const layout = (): AppUiSpec => ({ root: "root", state: { search: "" }, elements: {
  root: { type: "Stack", props: {}, children: ["heading", "left", "right"] },
  heading: { type: "Heading", props: { text: "Dashboard" }, children: [] },
  left: { type: "Grid", props: { columns: 2 }, children: ["a", "b", "c"] },
  right: { type: "Stack", props: {}, children: ["d"] },
  a: { type: "Card", props: { title: "Same title" }, children: ["nested"] },
  b: { type: "Card", props: { title: "Same title" }, children: [] },
  c: { type: "Card", props: {}, children: [] },
  d: { type: "Card", props: {}, children: [] },
  nested: { type: "Grid", props: {}, children: ["inner"] },
  inner: { type: "Card", props: {}, children: [] }
} });

test("panel moves reorder by stable identity and leave contents, defaults, and the input spec intact", () => {
  const ui = layout();
  const moved = moveAppPanel(ui, { panelId: "a", targetId: "c", placement: "after" });
  assert.deepEqual(moved.elements.left.children, ["b", "c", "a"]);
  assert.deepEqual(ui.elements.left.children, ["a", "b", "c"]);
  assert.equal(moved.elements.a, ui.elements.a);
  assert.equal(moved.state, ui.state);
  assert.equal(moved.elements.heading, ui.elements.heading);
  assert.deepEqual(moveAppPanel(moved, { panelId: "a", targetId: "b", placement: "before" }), ui);
  assert.equal(moveAppPanel(ui, { panelId: "a", targetId: "b", placement: "before" }), ui, "no-op moves keep identity");
  assert.equal(moveAppPanel(ui, { panelId: "a", targetId: "a", placement: "after" }), ui);
});

test("panels move between layout containers without duplication", () => {
  const ui = layout();
  const moved = moveAppPanel(ui, { panelId: "a", targetId: "d", placement: "before" });
  assert.deepEqual(moved.elements.left.children, ["b", "c"]);
  assert.deepEqual(moved.elements.right.children, ["a", "d"]);
  assert.equal(moved.elements.nested, ui.elements.nested);
  assert.throws(() => moveAppPanel(ui, { panelId: "a", targetId: "inner", placement: "after" }), /inside itself/);
  assert.throws(() => moveAppPanel(ui, { panelId: "heading", targetId: "d", placement: "after" }), /cannot be moved/);
  assert.throws(() => moveAppPanel(ui, { panelId: "a", targetId: "missing", placement: "after" }), /cannot be moved/);
});

test("repeated layouts and positional Tabs children are excluded, while a layout within a tab is editable", () => {
  const ui = layout();
  ui.elements.left.repeat = { statePath: "/rows" };
  ui.elements.right.type = "Tabs";
  assert.deepEqual([...appPanelLocations(ui).keys()], []);
  ui.elements.right.children = ["nested"];
  ui.elements.a.children = [];
  assert.deepEqual([...appPanelLocations(ui).keys()], ["inner"]);
});

test("ambiguous shared nodes and their descendants cannot be moved", () => {
  const ui = layout();
  ui.elements.right.children = ["a", "d"];
  assert.equal(appPanelLocations(ui).has("a"), false);
  assert.equal(appPanelLocations(ui).has("inner"), false);
});

test("arrow controls follow the current panel order and stop at the ends of the layout", () => {
  const ui = layout();
  assert.deepEqual(adjacentAppPanelMove(ui, "a", "next"), { panelId: "a", targetId: "b", placement: "after" });
  assert.deepEqual(adjacentAppPanelMove(ui, "c", "previous"), { panelId: "c", targetId: "b", placement: "before" });
  assert.equal(adjacentAppPanelMove(ui, "a", "previous"), null);
  assert.equal(adjacentAppPanelMove(ui, "c", "next"), null);
  assert.equal(adjacentAppPanelMove(ui, "heading", "next"), null);
});

test("render metadata identifies untitled and identically titled cards without changing the saved spec", () => {
  const ui = layout();
  const rendered = panelLayoutRenderSpec(ui);
  assert.equal(rendered.elements.a.props[PANEL_ID_PROP], "a");
  assert.equal(rendered.elements.b.props[PANEL_ID_PROP], "b");
  assert.equal(rendered.elements.c.props[PANEL_ID_PROP], "c");
  assert.equal(rendered.elements.heading, ui.elements.heading);
  assert.equal(ui.elements.a.props[PANEL_ID_PROP], undefined);
});

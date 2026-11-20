import assert from "node:assert/strict";
import test from "node:test";
import { connectorsAwaitingSignIn, signInNames } from "@/components/app/logic/apps/connectorSignIn";
import type { AppSpec } from "@shared/types/apps/apps.types";
import type { Connector } from "@shared/types/connectors/connectors.types";

const connector = (id: string, status: string, signedIn = false): Connector => ({ id, name: id, url: `https://${id}.example.com/mcp`, status, auth: { kind: "oauth", customClient: false, signedIn } } as unknown as Connector);
const spec = { sources: { a: { kind: "connector", connectorId: "notion" }, b: { kind: "connector", connectorId: "linear" } }, actions: {} } as unknown as Pick<AppSpec, "sources" | "actions">;

test("only the app's OAuth connectors that still need an account, or are mid sign-in, are waiting", () => {
  const waiting = connectorsAwaitingSignIn(spec, [connector("notion", "needs-auth"), connector("linear", "connected", true), connector("slack", "needs-auth")], () => undefined);
  assert.deepEqual(waiting.map((entry) => entry.id), ["notion"]);
  const signingIn = connectorsAwaitingSignIn(spec, [connector("linear", "connected", true)], (id) => id === "linear" ? "sign-in" : undefined);
  assert.deepEqual(signingIn.map((entry) => entry.id), ["linear"]);
});

test("names read as a short sentence however many connectors wait", () => {
  assert.equal(signInNames(["Notion"]), "Notion");
  assert.equal(signInNames(["Notion", "Linear"]), "Notion and Linear");
  assert.equal(signInNames(["Notion", "Linear", "Slack"]), "Notion, Linear and Slack");
  assert.equal(signInNames(["Notion", "Linear", "Slack", "Gmail"]), "Notion, Linear and 2 more");
});

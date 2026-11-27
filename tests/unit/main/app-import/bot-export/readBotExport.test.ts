import assert from "node:assert/strict";
import test from "node:test";
import { readBotExport } from "@main/app-import/bot-export/readBotExport";
import { botExportPrompt } from "@shared/app-import/botExportPrompt";

const reply = (body: object) => `Here's your export:\n\n\`\`\`json\n${JSON.stringify(body, null, 2)}\n\`\`\`\nLet me know if you need anything else.`;

test("a bot's reply with the export in a code block becomes bots fitted to Nora, without tools or secrets", () => {
  const result = readBotExport(reply({ format: "nora-bot-export", version: 1, source: "Grok Bot", bots: [{
    name: "Scout", role: "Finds the news", instructions: "Be brief.",
    skills: [{ name: "Headlines", description: "When asked for news", instructions: "List five headlines." }],
    model: { provider: "xai", model: "grok-4.5" }, avatar: { shape: "hex", color: "#14b8a6" },
    memory: ["Likes tea", "Likes tea", "x".repeat(1200)],
    routines: [
      { name: "Morning brief", instruction: "Summarise the news", timezone: "Europe/London", schedule: { kind: "daily", time: "08:00" } },
      { name: "Too often", instruction: "Ping", schedule: { kind: "custom", expression: "* * * * *" } },
      { name: "Nonsense", instruction: "Ping", schedule: { kind: "fortnightly" } }
    ],
    tools: [{ name: "Linear", url: "https://mcp.linear.app/sse" }],
    apiKey: "should be ignored"
  }] }));
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  const [bot] = result.plan.bots;
  assert.ok(bot);
  assert.equal(result.plan.source.displayName, "Bot export from Grok Bot");
  assert.equal(bot.importKey, "bot-export:bot:Grok%20Bot:Scout");
  assert.equal(bot.instructions, "Be brief.\n\n## Skill: Headlines\n\nWhen asked for news\n\nList five headlines.");
  assert.deepEqual(bot.avatar, { shape: "hexagon", palette: "teal" });
  assert.deepEqual(bot.model, { provider: "other", sourceProvider: "xai", model: "grok-4.5" });
  assert.equal(bot.memory.length, 2, "duplicates are dropped");
  assert.deepEqual(bot.routines.map((routine) => routine.name), ["Morning brief"]);
  assert.deepEqual(bot.adjustments, ["1 memory note shortened to 1000 characters.", "Nora can't run grok-4.5; it will use your default model."]);
  assert.deepEqual(result.plan.skipped.map((item) => item.label), ['Scout: routine "Too often"', 'Scout: routine "Nonsense"', 'Scout: tool "Linear"']);
  assert.ok(!JSON.stringify(result.plan).includes("should be ignored"));
});

test("anything that isn't a Nora bot export is refused with a reason", () => {
  for (const [document, reason] of [["no json here", /valid JSON/], [JSON.stringify({ format: "something-else", version: 1, bots: [{ name: "A" }] }), /Nora bot export/], [JSON.stringify({ format: "nora-bot-export", version: 1, bots: [] }), /at least one/]] as const) {
    const result = readBotExport(document);
    assert.equal(result.status, "unsupported");
    if (result.status === "unsupported") assert.match(result.reason, reason);
  }
});

test("the prompt asks for exactly the format Nora reads", () => {
  const prompt = botExportPrompt();
  assert.match(prompt, /"format": "nora-bot-export"/);
  assert.match(prompt, /Never include passwords, API keys/);
});

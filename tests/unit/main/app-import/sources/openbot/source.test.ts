import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openBotSource } from "@main/app-import/sources/openbot/source";
import { expectPlan, readContext, testEnvironment, withTempHome } from "../../../../helpers/appImport";

const SECRET_MARKER = "sk-openbot-secret";

test("OpenBot agents combine database rows with their folders; secrets and MCP details stay behind", async () => {
  await withTempHome(async (home) => {
    const data = path.join(home, "Library", "Application Support", "OpenBot");
    await mkdir(data, { recursive: true });
    const database = new DatabaseSync(path.join(data, "openbot.db"));
    database.exec(`
      CREATE TABLE projection_agents (agent_id TEXT, agent_json TEXT, api_key TEXT);
      CREATE TABLE projection_agent_memories (agent_id TEXT, text TEXT);
      CREATE TABLE projection_agent_routines (routine_id TEXT, agent_id TEXT, name TEXT, instruction TEXT, timezone TEXT);
      CREATE TABLE projection_routine_triggers (routine_id TEXT, kind TEXT, cron TEXT);
      CREATE TABLE projection_mcp_servers (name TEXT, url TEXT, headers TEXT);
    `);
    database.prepare("INSERT INTO projection_agents VALUES (?, ?, ?)").run("4f1c2a9e-0000-4000-8000-000000000001", JSON.stringify({ name: "Researcher", title: "Digs into topics" }), SECRET_MARKER);
    database.prepare("INSERT INTO projection_agent_memories VALUES (?, ?)").run("4f1c2a9e-0000-4000-8000-000000000001", "Prefers sources");
    database.prepare("INSERT INTO projection_agent_routines VALUES (?, ?, ?, ?, ?)").run("r1", "4f1c2a9e-0000-4000-8000-000000000001", "Daily digest", "Summarise yesterday", "Europe/London");
    database.prepare("INSERT INTO projection_agent_routines VALUES (?, ?, ?, ?, ?)").run("r2", "4f1c2a9e-0000-4000-8000-000000000001", "On email", "Reply", "UTC");
    database.prepare("INSERT INTO projection_routine_triggers VALUES (?, ?, ?)").run("r1", "schedule", "0 8 * * *");
    database.prepare("INSERT INTO projection_routine_triggers VALUES (?, ?, ?)").run("r2", "email", null);
    database.prepare("INSERT INTO projection_mcp_servers VALUES (?, ?, ?)").run("Linear", "https://mcp.linear.app", `Authorization: ${SECRET_MARKER}`);
    database.close();
    const agents = path.join(home, "OpenBot", "Agents");
    await mkdir(path.join(agents, "agent-4f1c2a9e-0000-4000-8000-000000000001", ".agents", "skills", "cite"), { recursive: true });
    await writeFile(path.join(agents, "agent-4f1c2a9e-0000-4000-8000-000000000001", "AGENTS.md"), "Research carefully.");
    await writeFile(path.join(agents, "agent-4f1c2a9e-0000-4000-8000-000000000001", ".agents", "skills", "cite", "SKILL.md"), "Always cite.");
    await mkdir(path.join(agents, "bot-travel-planner"), { recursive: true });
    await writeFile(path.join(agents, "bot-travel-planner", "CLAUDE.md"), "@AGENTS.md\n");

    const env = testEnvironment(home);
    assert.equal((await openBotSource.detect(env)).status, "found");
    const plan = expectPlan(await openBotSource.readPlan(readContext(env)));
    assert.deepEqual(plan.bots.map((bot) => [bot.name, bot.role, bot.instructions]), [
      ["Researcher", "Digs into topics", "Research carefully.\n\n## Skill: cite\n\nAlways cite."],
      ["Travel Planner", "", ""]
    ]);
    const [researcher] = plan.bots;
    assert.deepEqual(researcher?.memory, ["Prefers sources"]);
    assert.deepEqual(researcher?.routines, [{ name: "Daily digest", instruction: "Summarise yesterday", schedule: { kind: "custom", expression: "0 8 * * *" }, timezone: "Europe/London" }]);
    assert.deepEqual(plan.skipped.map((item) => item.label), ['Researcher: routine "On email"', 'MCP server "Linear"']);
    assert.ok(!JSON.stringify(plan).includes(SECRET_MARKER), "keys and headers are never read");
  });
});

test("OpenBot without its database still offers the agent folders, and is reported missing when neither exists", async () => {
  await withTempHome(async (home) => {
    const env = testEnvironment(home);
    assert.equal((await openBotSource.detect(env)).status, "notFound");
    await mkdir(path.join(home, "OpenBot", "Agents", "writer"), { recursive: true });
    const plan = expectPlan(await openBotSource.readPlan(readContext(env)));
    assert.deepEqual(plan.source.format, { source: "openbot", store: "agentFolders", remoteServer: null });
    assert.deepEqual(plan.bots.map((bot) => bot.name), ["Writer"]);
  });
});

test("OpenBot connected to a server reports the server's name, without reading its address or account", async () => {
  await withTempHome(async (home) => {
    const data = path.join(home, "Library", "Application Support", "OpenBot");
    await mkdir(data, { recursive: true });
    new DatabaseSync(path.join(data, "openbot.db")).close();
    const servers = { version: 3, activeServerId: "s1", servers: [
      { id: "s0", name: "old", apiUrl: "https://old.example" },
      { id: "s1", name: "citosoft", apiUrl: "https://server.example", username: "someone@example.com", fingerprint: SECRET_MARKER }
    ] };
    await writeFile(path.join(data, "openbot-remote-servers-v1.json"), JSON.stringify(servers));
    const env = testEnvironment(home);
    const plan = expectPlan(await openBotSource.readPlan(readContext(env)));
    assert.deepEqual(plan.source.format, { source: "openbot", store: "database", remoteServer: "citosoft" });
    assert.deepEqual(plan.bots, []);
    assert.ok(!JSON.stringify(plan).includes(SECRET_MARKER) && !JSON.stringify(plan).includes("server.example"));

    await writeFile(path.join(data, "openbot-remote-servers-v1.json"), JSON.stringify({ ...servers, activeServerId: null }));
    const local = expectPlan(await openBotSource.readPlan(readContext(env)));
    assert.deepEqual(local.source.format, { source: "openbot", store: "database", remoteServer: null });
  });
});

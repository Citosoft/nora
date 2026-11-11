import { query } from "@anthropic-ai/claude-agent-sdk";
import { homedir } from "node:os";
let release; const closed = new Promise((r) => { release = r; });
async function* idle() { await closed; }
const s = query({ prompt: idle(), options: { cwd: process.argv[2] ?? homedir() } });
const t = setTimeout(() => { console.log("timeout"); process.exit(1); }, 40000);
const st = await s.mcpServerStatus();
console.log(JSON.stringify(st.map((x) => ({ name: x.name, source: x.source, scope: x.scope, status: x.status }))));
clearTimeout(t); release(); s.close(); process.exit(0);

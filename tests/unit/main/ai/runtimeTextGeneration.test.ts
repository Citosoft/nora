import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { generateCodexText } from "@main/providers/codex/textGeneration";

test("Codex receives its prompt over stdin in an isolated ephemeral read-only invocation", { skip: process.platform === "win32" }, async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "nora-generation-test-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const executable = join(cwd, "codex-fixture");
  await writeFile(executable, `#!/usr/bin/env node
const fs = require('node:fs');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  fs.writeFileSync('request.json', JSON.stringify({ args: process.argv.slice(2), input, cwd: process.cwd() }));
  console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Add runtime naming' } }));
  console.log(JSON.stringify({ type: 'turn.completed' }));
});
`, { mode: 0o700 });
  const output = await generateCodexText({ executable, cwd, environment: process.env, request: { system: "Only a title", user: "Synthetic prompt" }, model: "gpt-5-mini" });
  assert.deepEqual(output, { text: "Add runtime naming", usage: null, model: "gpt-5-mini" });
  const captured = z.object({ args: z.array(z.string()), input: z.string(), cwd: z.string() }).parse(JSON.parse(await readFile(join(cwd, "request.json"), "utf8")));
  assert.match(captured.input, /Only a title\nDo not use tools/);
  assert.match(captured.input, /Synthetic prompt$/);
  assert.ok(!captured.args.includes("Synthetic prompt"));
  for (const flag of ["--ephemeral", "--ignore-user-config", "--ignore-rules"]) assert.ok(captured.args.includes(flag));
  assert.equal(captured.args[captured.args.indexOf("--sandbox") + 1], "read-only");
  assert.equal(captured.args[captured.args.indexOf("--model") + 1], "gpt-5-mini");
});

test("aborted naming cancels the Codex subprocess", { skip: process.platform === "win32" }, async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "nora-generation-abort-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const executable = join(cwd, "codex-fixture");
  await writeFile(executable, "#!/usr/bin/env node\nprocess.stdin.resume(); setTimeout(() => {}, 60000);\n", { mode: 0o700 });
  const controller = new AbortController();
  const result = generateCodexText({ executable, cwd, environment: process.env,
    request: { system: "Name", user: "Synthetic", signal: controller.signal }, model: null });
  controller.abort();
  await assert.rejects(result, /Codex text generation failed/);
});

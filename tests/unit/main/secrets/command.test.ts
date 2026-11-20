import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import test from "node:test";
import { runSecretCommand } from "@main/secrets/command";

const node = `"${process.execPath}"`;
const base = { cwd: tmpdir(), env: { NORA_TEST_SECRET: "from-env" }, signal: new AbortController().signal };

test("a command reads its secrets from the environment and reports output and exit code", async () => {
  const result = await runSecretCommand({ ...base, timeoutMs: 20_000,
    command: `${node} -e "process.stdout.write(process.env.NORA_TEST_SECRET); process.stderr.write('!'); process.exitCode = 3"` });
  assert.deepEqual([result.exitCode, result.timedOut], [3, false]);
  assert.match(result.output, /from-env/);
  assert.match(result.output, /!/);
});

test("a command that outlives its timeout is stopped and reported as timed out", async () => {
  const result = await runSecretCommand({ ...base, timeoutMs: 300, command: `${node} -e "setTimeout(() => {}, 60000)"` });
  assert.equal(result.timedOut, true);
});

const { createInterface } = require('node:readline');
const { appendFileSync } = require('node:fs');
const cwd = process.env.NORA_EXTERNAL_WORKSPACE;
const metadata = { source: process.env.NORA_EXTERNAL_SOURCE || 'cli', originator: null, id: 'native-cli', cwd, name: 'Continue terminal work', preview: 'Original CLI instruction', createdAt: 1794304800, updatedAt: 1794304860 };
createInterface({ input: process.stdin }).on('line', line => {
  const request = JSON.parse(line);
  if (!request.id) return;
  if (process.env.NORA_EXTERNAL_REQUEST_LOG) appendFileSync(process.env.NORA_EXTERNAL_REQUEST_LOG, `${JSON.stringify(request)}\n`);
  const reply = result => process.stdout.write(`${JSON.stringify({ id: request.id, result })}\n`);
  if (request.method === 'initialize') return reply({ userAgent: 'codex/fixture' });
  if (request.method === 'turn/steer') return process.stdout.write(`${JSON.stringify({ id: request.id, error: { code: -32601, message: 'Unsupported' } })}\n`);
  if (request.method === 'thread/list') return reply(request.params.cursor
    ? { data: [metadata], nextCursor: null }
    : { data: [{ ...metadata, id: 'other-workspace', cwd: `${cwd}-sibling` }], nextCursor: 'second-page' });
  if (request.method === 'thread/read') return reply({ thread: { ...metadata, turns: [{ id: 'old-turn', status: process.env.NORA_EXTERNAL_ACTIVE ? 'inProgress' : 'completed', items: [
    { type: 'userMessage', id: 'old-user', content: [{ type: 'text', text: 'Original CLI instruction' }] },
    { type: 'commandExecution', id: 'old-tool', command: 'git status', cwd, status: 'completed', aggregatedOutput: 'clean', exitCode: 0 },
    { type: 'agentMessage', id: 'old-assistant', text: 'Original CLI answer' }
  ] }] } });
  if (request.method === 'account/read') return reply({ requiresOpenaiAuth: true, account: { type: 'chatgpt' } });
  if (request.method === 'model/list') return reply({ data: [{ model: 'test-model', displayName: 'Test', description: '', hidden: false, defaultReasoningEffort: 'medium', supportedReasoningEfforts: [] }], nextCursor: null });
  if (request.method === 'thread/resume') return reply({ thread: { id: request.params.threadId } });
  if (request.method === 'turn/start') {
    reply({ turn: { id: 'new-turn' } });
    process.stdout.write(`${JSON.stringify({ method: 'turn/started', params: { threadId: 'native-cli', turn: { id: 'new-turn', status: 'inProgress' } } })}\n`);
    process.stdout.write(`${JSON.stringify({ method: 'turn/completed', params: { threadId: 'native-cli', turn: { id: 'new-turn', status: 'completed', error: null } } })}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify({ id: request.id, error: { code: -32601, message: 'Unexpected method' } })}\n`);
});

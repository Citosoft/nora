const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { createFixtureHost } = require('./ui/fixtureHost.cjs');
let host;
(async () => {
  host = await createFixtureHost('tests/ui/ThreadNavigationHarness.tsx', { width: 820 });
  const { wait, evaluate, click, window } = host;
  await wait(`!!document.querySelector('button[aria-label="Open Polish the workspace sidebar"]')`);
  await click('#load-external');
  await wait(`!!document.querySelector('button[aria-label="Open Continue the Claude investigation"]')`);
  const resumeButtons = 'button[aria-label="Open Continue the Claude investigation"],button[aria-label="Open Fix the terminal regression"]';
  assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(resumeButtons)}).length`), 2);
  if (process.env.NORA_UI_EVIDENCE_DIR) {
    await fs.mkdir(process.env.NORA_UI_EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, 'cli-discovery.png'), (await window.webContents.capturePage()).toPNG());
  }
  await click('button[aria-label="Open Continue the Claude investigation"]');
  await wait(`!!document.querySelector('button[aria-label="Pin Continue the Claude investigation"]')`);
  assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(resumeButtons)}).length`), 2);
  assert.equal(await evaluate(`document.querySelector('button[aria-label="Open Continue the Claude investigation"]').textContent.includes('CLI')`), false);
  await click('button[aria-label="Refresh resumable threads"]');
  await wait(`!!document.querySelector('button[aria-label="Open Fix the terminal regression"]')`);
  await click('button[aria-label="Open Fix the terminal regression"]');
  await wait(`!!document.querySelector('button[aria-label="Pin Fix the terminal regression"]')`);
  assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(resumeButtons)}).length`), 2);
  assert.deepEqual(await evaluate(`JSON.parse(document.querySelector('#navigation-state').textContent).commands`), ['create', 'create']);
  assert.equal(await evaluate(`(()=>{const sidebar=document.querySelector('#thread-sidebar');return sidebar.scrollWidth<=sidebar.clientWidth})()`), true);
  console.log('PASS: Codex and Claude CLI discovery, create-only import, native thread navigation, unified rows, refresh and deduplication.');
})().then(async () => { await host?.close(); app.exit(0); }).catch(async error => { console.error(error); await host?.close(); app.exit(1); });

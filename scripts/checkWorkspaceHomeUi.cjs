const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { createFixtureHost } = require('./ui/fixtureHost.cjs');
let host;
(async () => {
  host = await createFixtureHost('tests/ui/WorkspaceHomeHarness.tsx', { width: 1040 });
  const { evaluate, wait, byText, window } = host;
  await wait(`document.body.textContent.includes('Polish workspace navigation')`);
  assert.equal(await evaluate(`document.querySelector('h1').textContent`), 'Nora');
  assert.ok(await evaluate(`document.body.textContent.includes('1 needs attention')`));
  assert.equal(await evaluate(`document.querySelectorAll('section[aria-labelledby="home-tools-title"] button').length`), 6);
  for (const [label, tool] of [['Documents', 'documents'], ['Tasks', 'tasks'], ['Terminal', 'terminals'], ['Worktrees', 'worktrees'], ['Browser', 'browser'], ['Workflows', 'workflows']]) {
    await evaluate(`document.querySelectorAll('section[aria-labelledby="home-tools-title"] button').forEach(e => e.dataset.homeLabel = e.textContent.startsWith(${JSON.stringify(label)}) ? 'target' : '')`);
    await host.click('[data-home-label="target"]');
    assert.deepEqual(JSON.parse(await evaluate(`document.getElementById('home-route').textContent`)), { projectId: 'shell', tool });
  }
  await byText('New thread');
  let layout = JSON.parse(await evaluate(`document.getElementById('home-state').textContent`));
  assert.equal(layout.documents.find(entry => entry.id === layout.activeId).workspaceId, 'project');
  await evaluate(`Array.from(document.querySelectorAll('button')).find(e => e.textContent.includes('Polish workspace navigation')).click()`);
  layout = JSON.parse(await evaluate(`document.getElementById('home-state').textContent`));
  assert.equal(layout.documents.find(entry => entry.id === layout.activeId).target.conversationId, 'home-0');
  if (process.env.NORA_UI_EVIDENCE_DIR) {
    await fs.mkdir(process.env.NORA_UI_EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, 'workspace-home-light.png'), (await window.webContents.capturePage()).toPNG());
    await evaluate(`document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'`);
    await host.pause(100);
    await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, 'workspace-home-dark.png'), (await window.webContents.capturePage()).toPNG());
  }
  window.setSize(430, 760);
  await host.pause(100);
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`));
  assert.ok(await evaluate(`document.querySelector('section[aria-label="Workspace home"]').scrollHeight > document.querySelector('section[aria-label="Workspace home"]').clientHeight`));
  console.log('Workspace home: scoped thread creation, thread resume, six tool routes and narrow layout passed.');
  await host.close(); app.quit();
})().catch(async error => { console.error(error); await host?.close(); app.exit(1); });

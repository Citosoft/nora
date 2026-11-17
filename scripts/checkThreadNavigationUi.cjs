const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { createFixtureHost } = require('./ui/fixtureHost.cjs');
let host;
(async () => {
  host = await createFixtureHost('tests/ui/ThreadNavigationHarness.tsx', { width: 820 });
  const { wait, evaluate, click, byText, window, pause } = host;
  const grouping = '[role="combobox"][aria-label="Group threads by"]';
  const scope = '[role="combobox"][aria-label="Thread workspace scope"]';
  const viewOptions = 'button[aria-label="Thread view options"]';
  const threadButtons = 'section[aria-label="Threads"] button[aria-label^="Open "]';
  const labels = () => evaluate(`Array.from(document.querySelectorAll('section[aria-label="Threads"] [role="group"]'), e => e.getAttribute('aria-label'))`);
  const openOptions = async () => {
    await click(viewOptions);
    await wait(`!!document.querySelector('[role="dialog"][aria-label="Thread view options"]')`);
  };
  const closeOptions = async () => {
    await evaluate(`document.querySelector('[role="dialog"][aria-label="Thread view options"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
    await wait(`!document.querySelector('[role="dialog"][aria-label="Thread view options"]')`);
  };
  const chooseViewOption = async (selector, label) => {
    await openOptions(); await click(selector); await byText(label);
    await wait(`!document.querySelector('[role="listbox"]')`);
    await closeOptions();
  };
  const chooseGroup = label => chooseViewOption(grouping, label);
  const chooseFilter = label => chooseViewOption('[role="combobox"][aria-label="Filter threads"]', label);
  const showAll = async () => { await click(scope); await byText('All workspaces'); };
  await wait(`!!document.querySelector('button[aria-label="Open Polish the workspace sidebar"]')`);
  assert.equal(await evaluate(`document.querySelectorAll('section[aria-label="Threads"] [data-workspace-avatar]').length`), 0);
  await showAll();
  await wait(`document.querySelectorAll(${JSON.stringify(threadButtons)}).length===7`);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(threadButtons)})).every(e=>!!e.querySelector('[data-workspace-avatar]')&&e.getAttribute('aria-label').includes('workspace'))`), true);
  const originalColor = await evaluate(`document.querySelector('button[aria-label="Open Polish the workspace sidebar, workspace Nora Desktop"] [data-workspace-avatar]').className`);
  await chooseGroup('Workspace');
  await wait(`!!document.querySelector('[role="group"][aria-label="Marketing Site"]')`);
  assert.deepEqual(await labels(), ['Pinned', 'Marketing Site', 'Nora Desktop', 'Personal']);
  assert.equal(await evaluate(`document.querySelector('[role="group"][aria-label="Pinned"]').querySelectorAll('button[aria-label^="Open "]').length`), 1);
  await wait(`JSON.parse(localStorage.getItem('nora-sidebar-navigation')).threadGrouping==='workspace'`);
  await click('button[aria-label="Switch workspace"]');
  await wait(`!!document.querySelector('[role="dialog"][aria-label="Workspaces"]')`);
  assert.equal(await evaluate(`document.querySelector('[role="dialog"] [data-workspace-avatar="shell"]').className.replace('size-7 text-[10px]', 'size-5 text-[9px]')`), originalColor);
  await evaluate(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await wait(`!document.querySelector('[role="dialog"]')`);
  await click('input[aria-label="Search threads"]');
  window.webContents.insertText('Marketing');
  await wait(`document.querySelectorAll(${JSON.stringify(threadButtons)}).length===2`);
  assert.deepEqual(await labels(), ['Marketing Site']);
  await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Search threads"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await wait(`document.querySelectorAll(${JSON.stringify(threadButtons)}).length===7`);
  await chooseGroup('Activity');
  assert.deepEqual(await labels(), ['Pinned', 'Needs attention', 'In progress', 'Drafts', 'Other threads']);
  await chooseFilter('Active');
  assert.deepEqual(await labels(), ['Needs attention', 'In progress']);
  await chooseFilter('Recent');
  await click('button[aria-label="Pin Polish the workspace sidebar"]');
  await wait(`document.querySelector('[role="group"][aria-label="Pinned"]').querySelectorAll('button[aria-label^="Open "]').length===2`);
  await click('button[aria-label="Open Update the homepage, workspace Marketing Site, needs approval"]');
  await wait(`document.querySelector('#navigation-state').textContent.includes('website')`);
  await chooseGroup('No grouping');
  assert.deepEqual(await labels(), []);
  assert.equal(await evaluate(`document.querySelector('button[aria-label="Open Polish the workspace sidebar, workspace Nora Desktop"] [data-workspace-avatar]').className`), originalColor);
  await chooseGroup('Workspace');
  for (const theme of ['light', 'dark']) {
    await evaluate(`document.documentElement.classList.toggle('dark',${theme === 'dark'})`);
    await pause(100);
    assert.equal(await evaluate(`(()=>{const sidebar=document.querySelector('#thread-sidebar');return sidebar.scrollWidth<=sidebar.clientWidth})()`), true);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(threadButtons)})).every(e=>e.getBoundingClientRect().height<=40)`), true);
    if (process.env.NORA_UI_EVIDENCE_DIR) {
      await fs.mkdir(process.env.NORA_UI_EVIDENCE_DIR, { recursive: true });
      await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, `thread-navigation-${theme}.png`), (await window.webContents.capturePage()).toPNG());
    }
  }
  window.webContents.reload();
  await wait(`document.querySelector(${JSON.stringify(viewOptions)})?.getAttribute('aria-description').includes('Group by workspace')`);
  await showAll();
  await wait(`!!document.querySelector('[role="group"][aria-label="Marketing Site"]')`);
  await openOptions(); await click(grouping);
  await evaluate(`document.querySelector('[role="listbox"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await wait(`!document.querySelector('[role="listbox"]')`);
  assert.equal(await evaluate(`document.activeElement===document.querySelector(${JSON.stringify(grouping)})`), true);
  console.log('PASS: workspace avatars, shared colors, grouping, search, filters, pins, navigation, persisted grouping, keyboard focus, light/dark layout.');
})().then(async () => { await host?.close(); app.exit(0); }).catch(async error => { console.error(error); await host?.close(); app.exit(1); });

/** Actual Chromium acceptance for connected thread regions. No provider process or production state. */
const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { createFixtureHost } = require('./ui/fixtureHost.cjs');
let host;
(async () => {
  host = await createFixtureHost('tests/ui/ThreadWorkspaceHarness.tsx');
  const { evaluate, wait, click, byText, window, pause } = host;
  const visibleComposer = 'section[aria-label="New thread"] textarea';
  const state = async () => JSON.parse(await evaluate(`document.getElementById('thread-fixture-state').textContent`));
  const type = async (selector, text) => {
    await click(selector); window.webContents.insertText(text); await pause(100);
  };
  await wait(`!!document.querySelector('button[aria-label="Send instruction"]:not(:disabled)') || !!document.querySelector(${JSON.stringify(visibleComposer)})`);
  await wait(`document.body.textContent.includes('First model')`);
  const greeting = 'section[aria-label="New thread"] h1';
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(greeting)}).textContent`), 'What would you like to work on?');
  await evaluate(`localStorage.setItem('nora-user-display-name','  Daniel Smith  ');window.dispatchEvent(new StorageEvent('storage',{key:'nora-user-display-name',storageArea:localStorage}));`);
  await wait(`document.querySelector(${JSON.stringify(greeting)}).textContent==='What would you like to work on, Daniel?'`);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(greeting)}).querySelector('span').textContent`), 'Daniel');
  for (const theme of ['light', 'dark']) {
    await evaluate(`document.documentElement.dataset.theme='${theme}';document.documentElement.classList.toggle('dark','${theme}'==='dark')`);
    assert.equal(await evaluate(`(()=>{const heading=document.querySelector(${JSON.stringify(greeting)});return getComputedStyle(heading).color!==getComputedStyle(heading.querySelector('span')).color})()`), true);
    await click(visibleComposer);
    const inputSurface = await evaluate(`(()=>{const style=getComputedStyle(document.querySelector(${JSON.stringify(visibleComposer)}));return {background:style.backgroundColor,border:style.borderTopWidth}})()`);
    assert.deepEqual(inputSurface, { background: 'rgba(0, 0, 0, 0)', border: '0px' }, 'Chat input must blend into the composer while hovered and focused');
  }
  await evaluate(`localStorage.removeItem('nora-user-display-name');window.dispatchEvent(new StorageEvent('storage',{key:'nora-user-display-name',storageArea:localStorage}));`);
  await wait(`document.querySelector(${JSON.stringify(greeting)}).textContent==='What would you like to work on?'`);
  if (process.env.NORA_UI_EVIDENCE_DIR) {
    await fs.mkdir(process.env.NORA_UI_EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, 'new-thread.png'), (await window.webContents.capturePage()).toPNG());
  }
  const initialId = (await state()).layout.activeId;
  await type(visibleComposer, 'A draft to keep');
  await click('button[aria-label="New thread"]');
  await wait(`document.querySelectorAll('textarea').length===2`);
  const secondId = (await state()).layout.activeId;
  assert.notEqual(initialId, secondId);
  assert.equal((await state()).commands.length, 0, 'Draft creation must not call native execution');
  await byText('Draft something');
  await wait(`(()=>{const e=[...document.querySelectorAll('textarea')].find(e=>!e.closest('[inert]'));return e?.value==='Draft something'})()`);
  await click('button[aria-label="Close Draft something view"]');
  assert.equal((await state()).layout.activeId, initialId);
  assert.equal(await evaluate(`document.querySelector('textarea').value`), 'A draft to keep');
  await click('button[aria-label="Open Draft something"]');
  assert.equal((await state()).layout.activeId, secondId, 'Closed drafts reopen from sidebar');
  assert.equal(await evaluate(`(()=>{const inactive=document.querySelector('[inert]');const t=inactive?.querySelector('textarea');t?.focus();return !!inactive&&!inactive.contains(document.activeElement)})()`), true);
  await click('#lose-reply');
  await wait(`!![...document.querySelectorAll('button[aria-label="Send instruction"]')].find(e=>!e.disabled&&!e.closest('[inert]'))`);
  await evaluate(`(()=>{const e=[...document.querySelectorAll('button[aria-label="Send instruction"]')].find(e=>!e.closest('[inert]'));e.click()})()`);
  await wait(`document.body.textContent.includes('Reply lost')`);
  const uncertain = await state(); assert.equal(uncertain.accepted, 2); assert.equal(uncertain.layout.activeId, secondId);
  await click('button[aria-label="Retry saved instruction"]');
  await wait(`JSON.parse(document.getElementById('thread-fixture-state').textContent).layout.documents.find(d=>d.id===${JSON.stringify(secondId)}).target.kind==='thread'`);
  const sent = await state(); assert.equal(sent.layout.activeId, secondId); assert.equal(sent.accepted, 2);
  assert.deepEqual(sent.commands.slice(0, 2), sent.commands.slice(2), 'Retry must use saved command IDs');
  await wait(`!!document.querySelector('section[aria-label="Thread"] textarea')`);
  await type('section[aria-label="Thread"] textarea', 'Follow-up draft');
  await click('button[aria-label="Close Draft something view"]');
  await click('button[aria-label="Open Draft something"]');
  await wait(`document.querySelector('section[aria-label="Thread"] textarea')?.value==='Follow-up draft'`);
  await wait(`!document.querySelector('section[aria-label="Thread"] button[aria-label="Send instruction"]')?.disabled`);
  assert.equal((await state()).commands.length, 4, 'Closing a view must not interrupt or send');
  assert.equal(await evaluate(`document.querySelector('section[aria-label="Thread"] button[aria-label="Choose thread workspace"]').disabled`), true);
  if (process.env.NORA_UI_EVIDENCE_DIR) {
    await fs.mkdir(process.env.NORA_UI_EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, 'thread-regions.png'), (await window.webContents.capturePage()).toPNG());
    await evaluate(`document.documentElement.classList.add('dark');document.documentElement.dataset.theme='dark'`); await pause(100);
    await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, 'thread-regions-dark.png'), (await window.webContents.capturePage()).toPNG());
  }
  console.log('PASS: first-name greeting and updates, seamless chat input in both themes, connected sidebar/tabs/composer, independent drafts, inert focus, close/reopen, stable identity and retry. No inference.');
})().then(async () => { await host?.close(); app.exit(0); }).catch(async error => {
  console.error(error); if (host) console.error(await host.evaluate('document.body.innerText').catch(() => 'Renderer unavailable'));
  await host?.close(); app.exit(1);
});

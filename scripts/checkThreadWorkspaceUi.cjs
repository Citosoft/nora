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
  await click('#focus-window'); // Offscreen hosts have no OS window focus.
  await click('#run-background');
  await wait(`!!document.querySelector('section[aria-label="Threads"] [aria-label="Working"]')`);
  const activityPosition = await evaluate(`(()=>{const icon=document.querySelector('section[aria-label="Threads"] [aria-label="Working"]');const row=icon.closest('button');const title=row.querySelector('span');return {x:icon.parentElement.getBoundingClientRect().x,rightOfTitle:icon.getBoundingClientRect().left>=title.getBoundingClientRect().right}})()`);
  assert.equal(activityPosition.rightOfTitle, true, 'Activity appears to the right of the title');
  await click('#request-input');
  await wait(`!!document.querySelector('section[aria-label="Threads"] svg[aria-label="Needs input"]')`);
  assert.equal(await evaluate(`document.querySelector('section[aria-label="Threads"] svg[aria-label="Needs input"]').closest('button').textContent.includes('Needs input')`), false, 'Needs input uses an icon without visible status text');
  const inputIcon = await evaluate(`(()=>{const r=document.querySelector('section[aria-label="Threads"] svg[aria-label="Needs input"]').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
  window.webContents.sendInputEvent({ type: 'mouseMove', ...inputIcon });
  await wait(`!![...document.querySelectorAll('.pointer-events-none.fixed')].find(e=>e.textContent==='Needs input')`);
  const attentionStates = [
    ['awaiting-approval', 'Needs approval', 'lucide-shield-question'],
    ['failed', 'Failed', 'lucide-circle-alert'],
    ['recovering', 'Outcome unconfirmed', 'lucide-triangle-alert'],
    ['interrupted', 'Interrupted', 'lucide-circle-stop']
  ];
  for (const [stateValue, label, iconClass] of attentionStates) {
    await evaluate(`(()=>{const select=document.querySelector('#fixture-status');select.value=${JSON.stringify(stateValue)};select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    const selector = `section[aria-label="Threads"] svg[aria-label="${label}"]`;
    await wait(`!!document.querySelector(${JSON.stringify(selector)})`);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).classList.contains(${JSON.stringify(iconClass)})`), true);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).parentElement.getBoundingClientRect().x`), activityPosition.x);
    const point = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
    window.webContents.sendInputEvent({ type: 'mouseMove', ...point });
    await wait(`!![...document.querySelectorAll('.pointer-events-none.fixed')].find(e=>e.textContent===${JSON.stringify(label)})`);
  }
  await click('#pause-queue');
  await wait(`!!document.querySelector('section[aria-label="Threads"] svg[aria-label="Queue paused"]')`);
  await evaluate(`(()=>{const select=document.querySelector('#fixture-status');select.value='completed';select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await click('#finish-background');
  const completedRow = 'button[aria-label="Open A long background thread title that must stay on one row, unread completion"]';
  await wait(`!!document.querySelector(${JSON.stringify(completedRow)})`);
  assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(completedRow)}).querySelector('[aria-label="Unread completion"]')`), true);
  const rowGeometry = await evaluate(`(()=>{const row=document.querySelector(${JSON.stringify(completedRow)});const title=row.querySelector('span');return {height:row.getBoundingClientRect().height,truncated:title.scrollWidth>title.clientWidth}})()`);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Unread completion"]').parentElement.getBoundingClientRect().x`), activityPosition.x, 'Activity and unread use the same slot');
  assert.ok(rowGeometry.height <= 40, 'Thread rows must remain a single compact line');
  assert.equal(rowGeometry.truncated, true, 'Long titles truncate');
  await click(completedRow);
  await wait(`!document.querySelector('[aria-label="Unread completion"]')`);
  await click('button[aria-label="Close A long background thread title that must stay on one row view"]');
  await click('#return-draft');
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
  await wait(`!!document.querySelector('.thread-insights')`);
  for (const width of [1280, 900]) {
    window.setSize(width, 900);
    await pause(100);
    for (const expanded of [true, false]) {
      if (!expanded) await click('.thread-insights > button');
      const spacing = await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('.thread-insights').parentElement.querySelector('.thread-transcript'));return [s.paddingTop,s.paddingRight]})()`);
      await evaluate(`document.querySelector('main').dataset.changesSidebarOpen='true'`);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.thread-insights')).display`), 'none', 'Open sidebar hides chat details at every width');
      assert.deepEqual(await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('.thread-insights').parentElement.querySelector('.thread-transcript'));return [s.paddingTop,s.paddingRight]})()`), ['28px', '20px'], 'Hidden details reserve no transcript space');
      await evaluate(`document.querySelector('main').dataset.changesSidebarOpen='false'`);
      assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.thread-insights')).display`), 'none');
      assert.equal(await evaluate(`document.querySelector('.thread-insights > button').getAttribute('aria-expanded')`), String(expanded), 'Closing sidebar preserves detail expansion');
      assert.deepEqual(await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('.thread-insights').parentElement.querySelector('.thread-transcript'));return [s.paddingTop,s.paddingRight]})()`), spacing);
    }
    await click('.thread-insights > button');
  }
  window.setSize(1024, 900);
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

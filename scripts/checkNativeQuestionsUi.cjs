const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { createFixtureHost } = require('./ui/fixtureHost.cjs');
let host;
(async () => {
  host = await createFixtureHost('tests/ui/NativeQuestionsHarness.tsx');
  const { evaluate, wait, click, window, pause } = host;
  const submit = 'form button[type="submit"]';
  const checked = () => evaluate('[...document.querySelectorAll("input:checked")].map(input=>input.value)');
  await wait('!!document.querySelector("fieldset")');
  assert.equal(await evaluate(`document.querySelector('${submit}').disabled`), true);
  await click('input[value="Dogs"]');
  await click('input[value="Cats"]');
  assert.deepEqual(await checked(), ['Cats']);
  await click('input[value="Walking"]');
  await click('input[value="Reading"]');
  await click('input[value="Walking"]');
  assert.deepEqual(await checked(), ['Cats', 'Reading']);
  await evaluate('document.querySelector(\'input[value="Cooking"]\').focus()');
  window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space' });
  window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
  await wait('document.querySelector(\'input[value="Cooking"]\').checked');
  assert.equal(await evaluate(`document.querySelector('${submit}').disabled`), true);
  await click('input[placeholder="Your answer…"]');
  window.webContents.insertText('Keep it simple');
  await wait(`!document.querySelector('${submit}').disabled`);
  await click('#busy');
  assert.equal(await evaluate(`document.querySelector('${submit}').disabled`), true);
  assert.equal(await evaluate('document.body.textContent.includes("no longer answerable")'), false);
  await click('#busy');
  if (process.env.NORA_UI_EVIDENCE_DIR) {
    await fs.mkdir(process.env.NORA_UI_EVIDENCE_DIR, { recursive: true });
    for (const theme of ['light', 'dark']) {
      await evaluate(`document.documentElement.classList.toggle('dark', '${theme}'==='dark');document.documentElement.dataset.theme='${theme}'`);
      await pause(100);
      await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, `questions-${theme}.png`), (await window.webContents.capturePage()).toPNG());
    }
  }
  await click(submit);
  await wait('document.body.textContent.includes("Delivering response")');
  assert.deepEqual(JSON.parse(await evaluate('document.getElementById("responses").textContent')), [
    { kind: 'question', answers: { pet: ['Cats'], activities: ['Reading', 'Cooking'], details: ['Keep it simple'] } }
  ]);
  assert.equal(await evaluate(`document.querySelector('${submit}').disabled`), true);
  await click('#reset');
  assert.deepEqual(await checked(), []);
  assert.equal(await evaluate('document.querySelector(\'input[placeholder="Your answer…"]\').value'), '');
  // The Other control retains the predefined choices and reveals a separate text answer.
  await click('fieldset:first-child input[type="radio"]:not([value])');
  await wait('!!document.querySelector(\'input[aria-label="Other answer: Do you prefer dogs or cats?"]\')');
  assert.equal(await evaluate('document.querySelectorAll("input[type=radio]").length'), 3);
  assert.equal(await evaluate(`document.querySelector('${submit}').disabled`), true);
  await click('#expire');
  assert.equal(await evaluate('document.body.textContent.includes("no longer answerable")'), true);
  assert.equal(await evaluate('document.querySelector("fieldset").disabled'), true);
  console.log('PASS: single/multiple choices, keyboard selection, completion, submission payload, busy/expired states and request isolation.');
})().then(async () => { await host?.close(); app.exit(0); }).catch(async error => {
  console.error(error); await host?.close(); app.exit(1);
});

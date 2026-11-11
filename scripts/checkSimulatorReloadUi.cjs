const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { createFixtureHost } = require('./ui/fixtureHost.cjs');
const { createChatSimulator } = require('./ui/chatSimulatorHost.cjs');
let host, directory;
app.on('window-all-closed', () => {});
async function reloadAfter(change) {
  const contents = host.window.webContents;
  let loaded;
  const finished = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { contents.removeListener('did-finish-load', loaded); reject(new Error('Live reload timed out')); }, 12000);
    loaded = () => { clearTimeout(timeout); resolve(); };
    contents.once('did-finish-load', loaded);
  });
  await change(); await finished;
}
(async () => {
  directory = await fs.mkdtemp(join(tmpdir(), 'nora-reload-test-'));
  const entry = join(directory, 'fixture.js');
  const stylesInput = join(directory, 'styles.css');
  await fs.writeFile(entry, 'document.getElementById("app").textContent="Version one";');
  await fs.writeFile(stylesInput, 'body { --reload-proof: 1; }');
  host = await createFixtureHost(entry, { watch: true, stylesInput });
  await host.evaluate('localStorage.setItem("reload-draft","Keep my draft")');
  await reloadAfter(() => fs.writeFile(entry, 'document.getElementById("app").textContent="Version two";'));
  assert.equal(await host.evaluate('document.getElementById("app").textContent'), 'Version two');
  assert.equal(await host.evaluate('localStorage.getItem("reload-draft")'), 'Keep my draft');
  await reloadAfter(() => fs.writeFile(stylesInput, 'body { --reload-proof: 2; }'));
  assert.equal(await host.evaluate('getComputedStyle(document.body).getPropertyValue("--reload-proof").trim()'), '2');
  const replacement = join(directory, 'replacement.css');
  await fs.writeFile(replacement, 'body { --reload-proof: 3; }');
  await reloadAfter(() => fs.rename(replacement, stylesInput));
  assert.equal(await host.evaluate('getComputedStyle(document.body).getPropertyValue("--reload-proof").trim()'), '3');
  await host.close(); host = null;
  host = await createChatSimulator({ speed: 1 });
  const panel = '[role="tabpanel"]:not([inert])';
  await host.wait(`!!document.querySelector('${panel} textarea') && !!document.querySelector('${panel} button[aria-label="Send instruction"]:not(:disabled)')`);
  await host.click(`${panel} textarea`);
  await host.evaluate(`document.querySelector('${panel} textarea').select()`);
  host.window.webContents.insertText('/slow'); await host.pause(80);
  await host.click(`${panel} button[aria-label="Send instruction"]`);
  await host.wait(`!!document.querySelector('${panel} button[aria-label="Stop turn"]')`);
  await host.click(`${panel} textarea`); host.window.webContents.insertText('Keep this draft across reloads'); await host.pause(100);
  await host.evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Toggle theme').click()`);
  const before = await host.evaluate(`window.noraChatSimulator.conversations.read({schemaVersion:1,environmentId:'chat-simulator',kind:'summaries'})`);
  await reloadAfter(() => host.window.webContents.reloadIgnoringCache());
  await host.wait(`document.querySelector('${panel} textarea')?.value==='Keep this draft across reloads'`);
  await host.wait(`!!document.querySelector('${panel} button[aria-label="Queue instruction"]')`);
  assert.equal(await host.evaluate('document.documentElement.dataset.theme'), 'dark');
  const after = await host.evaluate(`window.noraChatSimulator.conversations.read({schemaVersion:1,environmentId:'chat-simulator',kind:'summaries'})`);
  assert.equal(after.summaries.length, before.summaries.length);
  assert.equal(after.summaries[0].latestRun.id, before.summaries[0].latestRun.id);
  console.log('PASS: source and CSS watch reloads, retained local storage, selected chat, draft, theme and active turn after refresh.');
})().then(async () => { await host?.close(); if (directory) await fs.rm(directory, { recursive: true, force: true }); app.exit(0); }).catch(async error => {
  console.error(error); await host?.close(); if (directory) await fs.rm(directory, { recursive: true, force: true }); app.exit(1);
});

const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { createChatSimulator } = require('./ui/chatSimulatorHost.cjs');
let host;
(async () => {
  host = await createChatSimulator({ speed: 0.08 });
  const { evaluate, wait, click, window, pause } = host;
  const panel = '[role="tabpanel"]:not([inert])';
  const currentText = `document.querySelector('${panel}').textContent`;
  const send = `${panel} section button[aria-label="Send instruction"]`;
  const action = async label => {
    await evaluate(`(()=>{const button=[...document.querySelector('${panel}').querySelectorAll('section[aria-label="Agent request"] button')].find(button=>button.textContent.trim().startsWith(${JSON.stringify(label)}));if(!button)throw Error('Missing action');button.dataset.simulatorAction='yes'})()`);
    await click('[data-simulator-action="yes"]');
  };
  const start = async scenario => {
    await click(`[data-scenario="${scenario}"]`);
    await wait(`!!document.querySelector('${send}:not(:disabled)')`);
    await click(send);
  };
  await wait(`!!document.querySelector('${send}:not(:disabled)')`);
  await click(send);
  await wait('!!document.querySelector(\'form[aria-label="Answer agent questions"]\')');
  await click('input[value="Cats"]');
  await click('input[value="Walking"]');
  await click('input[value="Reading"]');
  await click('input[placeholder="Your answer…"]'); window.webContents.insertText('Keep it simple');
  await wait('!document.querySelector(\'form[aria-label="Answer agent questions"] button[type=submit]\').disabled');
  await click('form[aria-label="Answer agent questions"] button[type=submit]');
  await wait(`${currentText}.includes("Allow this command?")`);
  await action('Allow once');
  await wait(`${currentText}.includes("Simulation complete.")`);
  assert.equal(await evaluate('document.body.textContent.includes("Cats") && document.body.textContent.includes("Walking, Reading")'), true);
  if (process.env.NORA_UI_EVIDENCE_DIR) {
    await fs.mkdir(process.env.NORA_UI_EVIDENCE_DIR, { recursive: true });
    await evaluate('document.documentElement.classList.add("dark");document.documentElement.dataset.theme="dark"'); await pause(80);
    await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, 'chat-simulator.png'), (await window.webContents.capturePage()).toPNG());
  }
  await start('approvals');
  await wait(`${currentText}.includes("Allow this command?")`); await action('Allow for this session');
  await wait(`${currentText}.includes("Allow file changes?")`); await action('Decline');
  await wait(`${currentText}.includes("Allow network access?")`); await action('Always allow this host');
  await wait(`${currentText}.includes("Simulation complete.")`);
  await start('tools');
  await wait(`${currentText}.includes("Simulation complete.")`);
  assert.equal(await evaluate(`${currentText}.includes("View image") && ${currentText}.includes("Search the web")`), true);
  await wait(`!!document.querySelector('${panel} aside[aria-label="Thread details"] [aria-label="3 additions, 2 deletions"]')`);
  assert.equal(await evaluate(`!!document.querySelector('${panel} details[aria-label="Reported file changes"] [aria-label="3 additions, 2 deletions"]')`), true);
  await click(`${panel} details[aria-label="Reported file changes"] > summary`);
  await click(`${panel} details[aria-label="Reported file changes"] details > summary`);
  for (const theme of ['light', 'dark']) {
    await evaluate(`document.documentElement.classList.toggle('dark','${theme}'==='dark');document.documentElement.dataset.theme='${theme}'`);
    const colors = await evaluate(`(()=>{const counts=document.querySelector('${panel} details[aria-label="Reported file changes"] [aria-label="3 additions, 2 deletions"]');return [...counts.children].map(child=>getComputedStyle(child).color.match(/\\d+/g).map(Number))})()`);
    assert.ok(colors[0][1] > colors[0][0], 'Addition counts must be green');
    assert.ok(colors[1][0] > colors[1][1], 'Deletion counts must be red');
    assert.equal(await evaluate(`!!document.querySelector('${panel} pre[aria-label="File diff"] .text-green-700') && !!document.querySelector('${panel} pre[aria-label="File diff"] .text-red-600')`), true);
    if (process.env.NORA_UI_EVIDENCE_DIR) {
      await pause(80);
      await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, `file-changes-${theme}.png`), (await window.webContents.capturePage()).toPNG());
    }
  }
  await start('slow');
  await wait(`!!document.querySelector('${panel} form button[aria-label="Stop turn"]')`);
  assert.equal(await evaluate(`document.querySelector('${panel} form button[aria-label="Stop turn"]').type`), 'button');
  assert.equal(await evaluate(`Array.from(document.querySelector('${panel}').querySelectorAll('button')).some(button=>button.textContent.trim()==='Interrupt')`), false);
  await click(`${panel} section[aria-label="Thread"] textarea`); window.webContents.insertText('/tools');
  await wait(`!!document.querySelector('${panel} button[aria-label="Queue instruction"]:not(:disabled)')`);
  await click(`${panel} button[aria-label="Queue instruction"]`);
  await wait(`${currentText}.includes("/tools")`);
  await wait(`!!document.querySelector('${panel} button[aria-label="Steer queued message 1"]:not(:disabled)')`);
  const beforeSteer = await evaluate(`window.noraChatSimulator.conversations.read({schemaVersion:1,environmentId:'chat-simulator',kind:'summaries'}).then(result=>result.summaries.find(entry=>entry.latestRun?.state==='running'))`);
  assert.ok(beforeSteer);
  await click(`${panel} button[aria-label="Steer queued message 1"]`);
  await wait(`!document.querySelector('${panel} section[aria-label="Queued instructions"]')`);
  const afterSteer = await evaluate(`window.noraChatSimulator.conversations.read({schemaVersion:1,environmentId:'chat-simulator',kind:'header',conversationId:${JSON.stringify(beforeSteer.conversation.id)}})`);
  assert.equal(afterSteer.header.activeRuns[0].id, beforeSteer.latestRun.id);
  assert.equal(afterSteer.header.queuedRuns.length, 0);
  await click(`${panel} form button[aria-label="Stop turn"]`);
  await wait(`!document.querySelector('${panel} button[aria-label="Stop turn"], ${panel} button[aria-label="Stopping turn"]')`);
  await start('recovery');
  await wait(`${currentText}.includes("Check native status")`);
  await evaluate(`(()=>{const button=[...document.querySelector('${panel}').querySelectorAll('button')].find(button=>button.textContent.trim()==='Check native status');button.dataset.simulatorAction='recover'})()`);
  await click('[data-simulator-action="recover"]');
  await wait(`!${currentText}.includes("Check native status")`);
  await start('expired');
  await wait(`${currentText}.includes("Choose your preferences")`);
  await wait(`${currentText}.includes("Check native status")`);
  assert.equal(await evaluate(`!!document.querySelector('${panel} form[aria-label="Answer agent questions"]')`), false);
  await evaluate(`(()=>{const button=[...document.querySelector('${panel}').querySelectorAll('button')].find(button=>button.textContent.trim()==='Check native status');button.dataset.simulatorAction='expired-recover'})()`);
  await click('[data-simulator-action="expired-recover"]');
  await wait(`!${currentText}.includes("Check native status")`);
  await start('usage-limit');
  await wait(`${currentText}.includes("Codex usage limit reached")`);
  assert.equal(await evaluate(`${currentText}.includes("Simulation complete.")`), false, 'Exhaustion must not display a successful reply');
  assert.equal(await evaluate(`!!document.querySelector('${panel} p[role="alert"]')`), true);
  await wait(`!!document.querySelector('section[aria-label="Threads"] svg[aria-label="Failed"]')`);
  const exhausted = await evaluate(`window.noraChatSimulator.conversations.read({schemaVersion:1,environmentId:'chat-simulator',kind:'summaries'}).then(result=>result.summaries.find(entry=>entry.latestRun?.failure?.code==='usage-limit'))`);
  assert.ok(exhausted);
  assert.ok(exhausted.latestRun.failure.resetsAt);
  assert.equal(await evaluate(`${currentText}.includes("Resets ")`), true);
  assert.equal(exhausted.latestRun.state, 'failed');
  for (const theme of ['light', 'dark']) {
    await evaluate(`document.documentElement.classList.toggle('dark','${theme}'==='dark');document.documentElement.dataset.theme='${theme}'`);
    if (process.env.NORA_UI_EVIDENCE_DIR) {
      await fs.mkdir(process.env.NORA_UI_EVIDENCE_DIR, { recursive: true });
      await pause(80);
      await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, `usage-limit-${theme}.png`), (await window.webContents.capturePage()).toPNG());
    }
  }
  await start('failure');
  await wait(`${currentText}.includes("Simulated provider failure")`);
  assert.equal(await evaluate(`!!document.querySelector('${panel} details[aria-label="Run command: Failed"]')`), true);
  await start('long-output');
  await wait(`${currentText}.includes("Simulation complete.")`);
  await click(`${panel} details summary`);
  assert.equal(await evaluate(`${currentText}.includes("Line 500:")`), true);
  // Scenario switching must work while earlier chats still await developer input.
  await start('questions');
  await wait(`!!document.querySelector('${panel} form[aria-label="Answer agent questions"]')`);
  await start('approvals');
  await wait(`${currentText}.includes("Allow this command?")`);
  await start('recovery');
  await wait(`${currentText}.includes("Check native status")`);
  await start('tools');
  await wait(`${currentText}.includes("Simulation complete.")`);
  const summary = await evaluate(`window.noraChatSimulator.conversations.read({schemaVersion:1,environmentId:'chat-simulator',kind:'summaries'})`);
  assert.ok(summary.summaries.length >= 5);
  for (const entry of summary.summaries) {
    const history = await evaluate(`window.noraChatSimulator.conversations.read({schemaVersion:1,environmentId:'chat-simulator',kind:'history',scope:'runs',conversationId:${JSON.stringify(entry.conversation.id)},limit:100})`);
    assert.ok(history.page.runs.every(run=>!run.usage || (run.usage.inputTokens===0 && run.usage.outputTokens===0)));
  }
  await start('markdown');
  await wait(`${currentText}.includes("Simulation complete.")`);
  for (const selector of ['h1', 'h2', 'h3', 'h4', 'strong', 'em', 'del', 'blockquote', 'ol', 'ul', 'table', 'hr', 'pre code.language-typescript', 'pre code.language-json', 'input[type="checkbox"]']) {
    assert.equal(await evaluate(`!!document.querySelector('${panel} article.native-prose ${selector}')`), true, selector);
  }
  assert.equal(await evaluate(`document.querySelector('${panel} article.native-prose a').getAttribute('href')`), 'https://example.com');
  await wait(`!!document.querySelector('${panel} [aria-label="Turn duration"]')`);
  console.log('PASS: real chat/IPC/engine loop, concurrent unfinished scenarios, streaming, answers, approvals, tools, queue/interrupt, recovery, expiry, failure and long output; zero token usage.');
})().then(async () => { await host?.close(); app.exit(0); }).catch(async error => {
  console.error(error); if (host) console.error(await host.evaluate('document.body.innerText').catch(()=>'Renderer unavailable'));
  await host?.close(); app.exit(1);
});

const { app } = require('electron');
const assert = require('node:assert/strict');
const { createChatSimulator } = require('./ui/chatSimulatorHost.cjs');
let host;
(async () => {
  host = await createChatSimulator({ speed: 0.2 });
  const { evaluate, wait, click, window, pause, byText } = host;
  window.setSize(1100, 650);
  const scenarios = 'section[aria-label="Simulator scenarios"] > div';
  const threads = 'section[aria-label="Threads"] > div:last-child';
  const panel = '[role="tabpanel"]:not([inert])';
  const transcript = `${panel} .thread-transcript`;
  const top = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollTop`);
  const wheel = async (selector, deltaY) => {
    const point = await evaluate(`(()=>{
      const element=document.querySelector(${JSON.stringify(selector)});const r=element.getBoundingClientRect();
      let left=Math.max(0,r.left),right=Math.min(innerWidth,r.right),top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.bottom);
      for(let parent=element.parentElement;parent;parent=parent.parentElement){
        const style=getComputedStyle(parent),bounds=parent.getBoundingClientRect();
        if(style.overflowY!=='visible'){top=Math.max(top,bounds.top);bottom=Math.min(bottom,bounds.bottom)}
        if(style.overflowX!=='visible'){left=Math.max(left,bounds.left);right=Math.min(right,bounds.right)}
      }
      if(bottom<=top||right<=left)throw Error('Scroll target is not visible: '+${JSON.stringify(selector)});
      return {x:Math.round((left+right)/2),y:Math.round((top+bottom)/2)};
    })()`);
    window.webContents.focus();
    window.webContents.sendInputEvent({ type: 'mouseMove', ...point });
    await pause(40);
    window.webContents.sendInputEvent({ type: 'mouseWheel', ...point, deltaY, deltaX: 0, canScroll: true });
  };
  const start = async scenario => {
    await click(`[data-scenario="${scenario}"]`);
    await wait(`!!document.querySelector('${panel} button[aria-label="Send instruction"]:not(:disabled)')`);
    await click(`${panel} button[aria-label="Send instruction"]`);
  };
  await wait(`!!document.querySelector('${panel} textarea')`);
  await pause(150);
  assert.ok(await evaluate(`document.querySelector('${threads}').clientHeight>100`), 'Thread list must retain usable height beside the scenario gallery');
  await wheel(scenarios, -250);
  await wait(`document.querySelector('${scenarios}').scrollTop>0`);
  for (let i = 0; i < 10; i++) await click('[data-scenario="questions"]');
  const scenarioTop = await top(scenarios);
  await wheel(threads, -250);
  await wait(`document.querySelector('${threads}').scrollTop>0`);
  assert.equal(await top(scenarios), scenarioTop, 'Scrolling threads must not move the scenario gallery');
  assert.equal(await evaluate('document.querySelector("main").scrollHeight===document.querySelector("main").clientHeight'), true);
  await start('markdown');
  await wait(`document.querySelector('${transcript}').scrollHeight>document.querySelector('${transcript}').clientHeight+200`);
  const before = await top(transcript);
  await wheel(transcript, 50);
  await wait(`document.querySelector('${transcript}').scrollTop<${before - 2}`);
  await pause(500);
  assert.ok(await top(transcript) < before - 2, 'Streaming must not undo a small upward wheel movement');
  await wait(`Array.from(document.querySelectorAll('${panel} button')).some(button=>button.textContent.trim()==='Jump to latest')`);
  await byText('Jump to latest');
  await wait(`(()=>{const e=document.querySelector('${transcript}');return e.scrollHeight-e.scrollTop-e.clientHeight<=2})()`);
  await start('long-output');
  await wait(`document.querySelector('${panel}').textContent.includes('Simulation complete.')`);
  await click(`${panel} details[aria-label="Turn tool history"] > summary`);
  await click(`${panel} details[aria-label="Run command: Done"] > summary`);
  const output = `${panel} details[aria-label="Run command: Done"] pre.max-h-80`;
  await evaluate(`document.querySelector('${output}').scrollIntoView({block:'center'})`); await pause(100);
  const transcriptTop = await top(transcript);
  await wheel(output, -250);
  await wait(`document.querySelector('${output}').scrollTop>0`);
  assert.equal(await top(transcript), transcriptTop, 'Tool output should scroll independently');
  console.log('PASS: real wheel scrolling in scenarios, threads, streaming transcript and expanded tool output; no stream snap-back; Jump to latest resumes following.');
})().then(async () => { await host?.close(); app.exit(0); }).catch(async error => { console.error(error); await host?.close(); app.exit(1); });

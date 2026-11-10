const { app, BrowserWindow } = require('electron');
const { build } = require('esbuild');
const fs = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { pathToFileURL } = require('node:url');
const root = resolve(__dirname, '../..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Isolated, no-preload Chromium host shared by component acceptance suites. */
async function createFixtureHost(entry) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'nora-component-ui-'));
  app.setPath('userData', join(directory, 'electron'));
  let window;
  try {
    await fs.mkdir(join(directory, 'product-icons'));
    for (const icon of ['openai.com.png', 'anthropic.com.png']) await fs.copyFile(join(root, 'renderer/product-icons', icon), join(directory, 'product-icons', icon));
    await build({ entryPoints: [join(root, entry)], bundle: true, platform: 'browser', format: 'iife',
      outfile: join(directory, 'bundle.js'), tsconfig: join(root, 'tsconfig.json'), jsx: 'automatic' });
    const css = pathToFileURL(join(root, 'dist/renderer/styles.css')).href;
    await fs.writeFile(join(directory, 'index.html'), `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${css}"></head><body><div id="app"></div><script src="bundle.js"></script></body></html>`);
    await app.whenReady();
    window = new BrowserWindow({ show: false, width: 1024, height: 900, webPreferences: { offscreen: true, nodeIntegration: false, contextIsolation: true } });
    const evaluate = code => window.webContents.executeJavaScript(code, true);
    const wait = async code => { for (let i = 0; i < 120; i++) { if (await evaluate(code)) return; await pause(40); } throw new Error('UI condition timed out: ' + code); };
    const click = async selector => {
      const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control: '+${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`);
      window.webContents.sendInputEvent({ type: 'mouseMove', ...point });
      window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point });
      window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point });
      await pause(60);
    };
    const byText = async text => {
      const selector = '[data-acceptance-target="yes"]';
      await evaluate(`(()=>{const e=[...document.querySelectorAll('button,[role="option"]')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&!e.closest('[inert]'));if(!e)throw Error('Missing text control: '+${JSON.stringify(text)});e.setAttribute('data-acceptance-target','yes');})()`);
      await click(selector); await evaluate(`document.querySelector('[data-acceptance-target]')?.removeAttribute('data-acceptance-target')`);
    };
    await window.loadFile(join(directory, 'index.html'));
    return { window, evaluate, wait, click, byText, pause, async close() { window.destroy(); await fs.rm(directory, { recursive: true, force: true }); } };
  } catch (error) { window?.destroy(); await fs.rm(directory, { recursive: true, force: true }); throw error; }
}
module.exports = { createFixtureHost };

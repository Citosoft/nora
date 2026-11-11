const { ipcMain } = require('electron');
const { build } = require('esbuild');
const fs = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { createFixtureHost } = require('./fixtureHost.cjs');

/** Separate process and temp database; production providers and credentials are never loaded. */
async function createChatSimulator(options = {}) {
  const root = resolve(__dirname, '../..');
  const directory = await fs.mkdtemp(join(tmpdir(), 'nora-chat-simulator-'));
  let runtime, fixture, unregister, allowedWindow;
  let closed = false;
  const close = async () => {
    if (closed) return; closed = true;
    unregister?.(); ipcMain.removeHandler('simulator:boot');
    await runtime?.host.shutdown(); await fixture?.close();
    await fs.rm(directory, { recursive: true, force: true });
  };
  try {
    const common = { bundle: true, platform: 'node', format: 'cjs', external: ['electron'], tsconfig: join(root, 'tsconfig.json') };
    await build({ ...common, entryPoints: [join(root, 'tests/simulator/main/host.ts')], outfile: join(directory, 'host.cjs') });
    await build({ ...common, entryPoints: [join(root, 'tests/simulator/main/preload.ts')], outfile: join(directory, 'preload.cjs') });
    const { createSimulatorHost, registerConversationIpc } = require(join(directory, 'host.cjs'));
    runtime = createSimulatorHost(directory, options.speed ?? 1);
    const allowed = event => !!allowedWindow && !allowedWindow.isDestroyed()
      && event.sender.id === allowedWindow.webContents.id && event.senderFrame?.url === allowedWindow.webContents.getURL()
      && event.senderFrame.url.startsWith('file:');
    unregister = registerConversationIpc({ ipc: ipcMain, resolveHost: id => id === runtime.host.environmentId ? runtime.host : null, isAllowedSender: allowed });
    ipcMain.handle('simulator:boot', event => { if (!allowed(event)) throw new Error('Simulator window only'); return runtime.boot; });
    fixture = await createFixtureHost('tests/simulator/renderer/Simulator.tsx', {
      preload: join(directory, 'preload.cjs'), watch: options.watch ?? false, visible: options.visible ?? false, width: 1360, title: 'Nora · Developer chat simulator',
      onWindow(window) {
        allowedWindow = window;
        window.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (_details, done) => done({ cancel: true }));
        window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        window.webContents.on('will-navigate', event => event.preventDefault());
      }
    });
    return { ...fixture, close };
  } catch (error) { await close(); throw error; }
}
module.exports = { createChatSimulator };

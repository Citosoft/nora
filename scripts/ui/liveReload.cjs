const { context } = require('esbuild');
const { watch } = require('node:fs');
const { basename, dirname } = require('node:path');

/** Reload only successful builds; keep the Electron backend and its database alive. */
async function startLiveReload({ buildOptions, stylePaths, compileStyles, reload }) {
  let closed = false;
  let timer;
  let pending = Promise.resolve();
  const schedule = () => {
    if (closed) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      pending = pending.then(async () => {
        if (closed) return;
        try {
          await compileStyles();
          if (!closed) { await reload(); console.log('[simulator] Reloaded UI'); }
        } catch (error) { console.error('[simulator] Reload failed; keeping the current UI.', error); }
      });
    }, 100);
  };
  let ready;
  const initial = new Promise(resolve => { ready = resolve; });
  const renderer = await context({ ...buildOptions, plugins: [{ name: 'fixture-live-reload', setup(build) {
    build.onEnd(result => {
      if (ready) { ready(); ready = null; return; }
      if (!result.errors.length) schedule();
    });
  } }] });
  const watchers = [];
  const close = async () => {
    closed = true; clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
    await renderer.dispose(); await pending;
  };
  try {
    await renderer.watch(); await initial;
    // Watch directories so atomic editor saves do not detach the file watcher.
    for (const path of stylePaths) watchers.push(watch(dirname(path), (_event, filename) => {
      if (!filename || filename.toString() === basename(path)) schedule();
    }));
    return close;
  } catch (error) { await close(); throw error; }
}
module.exports = { startLiveReload };

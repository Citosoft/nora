const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { createFixtureHost } = require('./ui/fixtureHost.cjs');
let host;
(async () => {
  host = await createFixtureHost('tests/ui/ChatFormattingHarness.tsx');
  const { evaluate, wait, click, window, pause } = host;
  await wait('!!document.querySelector("article table")');
  const originalUrl = await evaluate('location.href');
  for (const [href, path] of [['src/app.ts', 'src/app.ts'], ['/repo/docs/guide.md:12', 'docs/guide.md'], ['file:///repo/README.md', 'README.md']]) {
    await click(`article a[href="${href}"]`);
    assert.equal(await evaluate('document.querySelector(\'output[aria-label="Opened file"]\').textContent'), path);
    assert.equal(await evaluate('location.href'), originalUrl, 'Chat file clicks must not navigate the app');
  }
  for (const theme of ['light', 'dark']) {
    await evaluate(`document.documentElement.classList.toggle('dark','${theme}'==='dark');document.documentElement.dataset.theme='${theme}'`);
    const styles = await evaluate(`(()=>{
      const article=document.querySelector('article');
      const style=selector=>getComputedStyle(article.querySelector(selector));
      return {heading:parseFloat(style('h1').fontSize),body:parseFloat(style('p').fontSize),weight:style('h4').fontWeight,
        unordered:style('ul').listStyleType,ordered:style('ol').listStyleType,nestedPadding:parseFloat(style('ul ul').paddingLeft),
        quote:parseFloat(style('blockquote').borderLeftWidth),link:style('a').textDecorationLine,
        codeBackground:style('p code').backgroundColor,paragraphBackground:style('p').backgroundColor,
        blocks:[...article.querySelectorAll('pre')].map(pre=>({background:getComputedStyle(pre).backgroundColor,padding:parseFloat(getComputedStyle(pre).paddingLeft),overflow:getComputedStyle(pre).overflowX})),
        tablePadding:parseFloat(style('td').paddingLeft),alignments:[...article.querySelectorAll('th')].map(th=>getComputedStyle(th).textAlign),
        taskMarker:style('.task-list-item').listStyleType,
        contained:document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth};
    })()`);
    assert.ok(styles.heading > styles.body);
    assert.ok(Number(styles.weight) >= 600);
    assert.equal(styles.unordered, 'disc'); assert.equal(styles.ordered, 'decimal');
    assert.ok(styles.nestedPadding > 0); assert.ok(styles.quote > 0);
    assert.ok(styles.link.includes('underline'));
    assert.notEqual(styles.codeBackground, styles.paragraphBackground);
    assert.equal(styles.blocks.length, 3);
    for (const block of styles.blocks) { assert.notEqual(block.background, 'rgba(0, 0, 0, 0)'); assert.ok(block.padding > 0); assert.equal(block.overflow, 'auto'); }
    assert.ok(styles.tablePadding > 0); assert.deepEqual(styles.alignments, ['left', 'center', 'right']);
    assert.equal(styles.taskMarker, 'none'); assert.equal(styles.contained, true);
    if (process.env.NORA_UI_EVIDENCE_DIR) {
      await fs.mkdir(process.env.NORA_UI_EVIDENCE_DIR, { recursive: true });
      await evaluate('document.querySelector("main").scrollTop=0'); await pause(50);
      await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, `markdown-${theme}.png`), (await window.webContents.capturePage()).toPNG());
      await evaluate('document.querySelector("section[aria-label=\\"Turn file changes\\"]").scrollIntoView({block:"center"})'); await pause(50);
      await fs.writeFile(join(process.env.NORA_UI_EVIDENCE_DIR, `changes-${theme}.png`), (await window.webContents.capturePage()).toPNG());
    }
  }
  const card = 'section[aria-label="Turn file changes"]';
  assert.equal(await evaluate(`document.querySelectorAll('${card} details').length`), 3);
  assert.equal(await evaluate(`document.querySelector('${card} h3').textContent`), 'Edited 4 files');
  assert.equal(await evaluate(`document.querySelector('${card} button[aria-label="Undo unavailable for turn changes"]').disabled`), true);
  await click(`${card} > button`);
  assert.equal(await evaluate(`document.querySelectorAll('${card} details').length`), 4);
  await click(`${card} > button`);
  assert.equal(await evaluate(`document.querySelectorAll('${card} details').length`), 3);
  await click(`${card} details summary`);
  assert.equal(await evaluate(`document.querySelector('${card} details').open`), true);
  await click(`${card} header button[aria-controls]`);
  assert.equal(await evaluate(`document.querySelectorAll('${card} details[open]').length`), 4);
  await click(`${card} header button[aria-controls]`);
  assert.equal(await evaluate(`document.querySelectorAll('${card} details[open]').length`), 0);
  window.setSize(420, 900); await pause(100);
  assert.equal(await evaluate('document.querySelector("main").scrollWidth<=document.querySelector("main").clientWidth'), true);
  console.log('PASS: Markdown visual styles in both themes, plain/language code fences, table alignment, responsive overflow, final change card, show more and per-file/all diffs.');
})().then(async () => { await host?.close(); app.exit(0); }).catch(async error => {
  console.error(error); await host?.close(); app.exit(1);
});

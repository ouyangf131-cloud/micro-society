// Playwright QA for 微型社会模拟器. Usage: node qa/qa.js <url> <outPrefix>
const { chromium } = require('/workspace/ms-qa/node_modules/playwright-core');
const fs = require('fs');
const URL = process.argv[2] || 'http://127.0.0.1:8765/index.html';
const TAG = process.argv[3] || 'local';
const SHOTS = '/workspace/micro-society/shots/';
const results = { url: URL, tag: TAG, startedAt: new Date().toString(), widths: {}, determinism: null, timing: {}, sample: null };

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const width of [375, 430]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    const page = await ctx.newPage();
    const R = { console: [], pageErrors: [], external: [], failed: [], overflow: [], small: [], checks: [] };
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) R.console.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', e => R.pageErrors.push(String(e)));
    page.on('request', r => { const u = r.url(); if (!u.startsWith(URL.split('/').slice(0, 3).join('/')) && !u.startsWith('data:')) R.external.push(u); });
    page.on('requestfailed', r => R.failed.push(r.url()));
    const resp = await page.goto(URL, { waitUntil: 'load' });
    R.httpStatus = resp.status();
    const check = async (label) => {
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
      if (o.sw > o.cw || o.bw > o.cw) R.overflow.push(label + ' ' + JSON.stringify(o));
      const small = await page.evaluate(() => [...document.querySelectorAll('button,select,input,summary')].filter(e => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden'; })
        .map(e => { const r = e.getBoundingClientRect(); return { t: (e.textContent || e.id || e.tagName).trim().slice(0, 20), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; }));
      const bad = small.filter(x => x.w < 44 || x.h < 44);
      R.checks.push({ label, scroll: o, controls: small.length, minW: Math.min(...small.map(x => x.w)), minH: Math.min(...small.map(x => x.h)) });
      for (const b of bad) R.small.push(label + ' ' + JSON.stringify(b));
    };
    const shot = async (name, full = false) => page.screenshot({ path: SHOTS + `${TAG}-${width}-${name}.png`, fullPage: full });
    const day = () => page.evaluate(() => window.__ms.sim().S.day);

    await check('initial'); await shot('01-initial');
    await page.click('#btnStep'); R.afterStep1 = await day();
    await page.click('[data-tab=log]'); await page.evaluate(() => document.querySelector('.tabs').scrollIntoView()); await check('log-day1'); await shot('02-log-day1');
    await page.click('[data-tab=charts]');
    await page.click('#btnStep30'); R.after30 = await day();
    await check('charts-day31'); await shot('03-charts-day31', true);
    // auto-run / pause
    await page.click('#btnRun'); await page.waitForTimeout(1600); await page.click('#btnRun');
    const d1 = await day(); await page.waitForTimeout(800); const d2 = await day();
    R.autoRun = { dayAfterRun: d1, dayAfter800msPaused: d2, advanced: d1 > R.after30, pausedStable: d1 === d2 };
    await page.click('[data-tab=people]'); await page.evaluate(() => document.querySelector('.tabs').scrollIntoView()); await check('people'); await shot('04-people');
    await page.click('#plist .person'); await page.waitForTimeout(100);
    await check('detail'); await shot('05-detail');
    const chip = await page.$('#panel .chips button');
    if (chip) { await chip.click(); R.detailJump = await page.evaluate(() => document.querySelector('#panel h2').textContent); }
    await page.click('#btnClose'); R.detailClosed = !(await page.evaluate(() => document.getElementById('sheet').classList.contains('show')));
    await page.click('[data-tab=log]'); await page.evaluate(() => document.querySelector('.tabs').scrollIntoView()); await check('log'); await shot('06-log');
    await page.click('[data-tab=rules]'); await check('rules'); await shot('07-rules', true);
    // rules text consistency spot check: values appear
    R.rulesHasValues = await page.evaluate(() => { const t = document.getElementById('tab-rules').textContent; const C = CONFIG; return [C.population, C.needs.satietyDecay, C.market.merchantFee * 100 + '%', C.social.robMax, C.welfare.taxThreshold].map(v => [String(v), t.includes(String(v))]); });
    // long run timing with charts visible (UI rendering every day)
    await page.click('[data-tab=charts]');
    await page.evaluate(() => window.__ms.reset(20261107));
    const tm = await page.evaluate(() => { const ms = window.__ms; const t0 = performance.now(); let max = 0; for (let i = 0; i < 365; i++) { const a = performance.now(); ms.stepDays(1); max = Math.max(max, performance.now() - a); } return { days: 365, totalMs: performance.now() - t0, maxDayMsInclRender: max, hash: ms.sim().hash(), day: ms.sim().S.day }; });
    R.timing365WithRender = tm;
    await check('charts-day365'); await shot('08-charts-day365', true);
    const tm2 = await page.evaluate(() => { const ms = window.__ms; const t0 = performance.now(); for (let i = 0; i < 635; i++) ms.sim().step(); const eng = performance.now() - t0; ms.stepDays(0); return { days: 635, engineOnlyMs: eng, day: ms.sim().S.day, hash: ms.sim().hash(), alive: ms.sim().S.history.at(-1).alive }; });
    R.timingTo1000EngineOnly = tm2;
    await shot('09-charts-day1000', true);
    // fast auto-run at 60 days/s
    await page.selectOption('#speed', '60'); await page.click('#btnRun'); await page.waitForTimeout(2000); await page.click('#btnRun');
    R.fastRun = { day: await day() };
    // determinism
    R.determinism = await page.evaluate(() => {
      const ms = window.__ms; const run = s => { ms.reset(s); for (let i = 0; i < 365; i++) ms.sim().step(); return ms.sim().hash(); };
      const a = run(20261107), b = run(20261107), c = run(12345);
      return { seedA: 20261107, hashA1: a, hashA2: b, same: a === b, seedB: 12345, hashB: c, differs: a !== c };
    });
    // seed input + reset via UI
    await page.click('#btnStep'); await page.fill('#seedInput', '12345'); await page.click('#btnReset');
    R.runLabelAfterReset = await page.evaluate(() => ({ day: window.__ms.sim().S.day, label: document.getElementById('btnRun').textContent }));
    for (let i = 0; i < 3; i++) await page.click('#btnStep');
    R.uiSeed = await page.evaluate(() => ({ seed: window.__ms.sim().S.seed, day: window.__ms.sim().S.day, hash: window.__ms.sim().hash() }));
    if (width === 375) {
      R.sample = await page.evaluate(() => { const ms = window.__ms; ms.reset(20261107); for (let i = 0; i < 1000; i++) ms.sim().step(); const H = ms.sim().S.history; return [0, 30, 100, 365, 1000].map(d => H.find(r => r.day === d)); });
    }
    await check('final');
    results.widths[width] = R;
    await ctx.close();
  }
  // second fresh context for cross-load determinism
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  await p.goto(URL + (URL.includes('?') ? '&' : '?') + 'seed=20261107');
  results.freshLoadHash365 = await p.evaluate(() => { for (let i = 0; i < 365; i++) window.__ms.sim().step(); return window.__ms.sim().hash(); });
  await browser.close();
  results.finishedAt = new Date().toString();
  fs.writeFileSync(`/workspace/micro-society/qa/results-${TAG}.json`, JSON.stringify(results, null, 2));
  const s = results.widths;
  console.log(JSON.stringify({ errors: Object.fromEntries(Object.entries(s).map(([w, r]) => [w, { console: r.console, pageErrors: r.pageErrors, external: r.external, failed: r.failed, overflow: r.overflow, small: r.small.slice(0, 10), status: r.httpStatus, autoRun: r.autoRun, t365: r.timing365WithRender, t1000: r.timingTo1000EngineOnly, det: r.determinism, fast: r.fastRun, jump: r.detailJump, closed: r.detailClosed, rules: r.rulesHasValues, uiSeed: r.uiSeed, labelAfterReset: r.runLabelAfterReset }])), fresh: results.freshLoadHash365 }, null, 1));
  if (results.widths[375].sample) {
    const rows = results.widths[375].sample;
    fs.writeFileSync(`/workspace/micro-society/qa/sample-${TAG}.json`, JSON.stringify(rows, null, 2));
    const cols = ['day', 'alive', 'dead', 'births', 'gini', 'totalWealth', 'totalMoney', 'pool', 'emergency', 'barter', 'foodEaten', 'foodProduced', 'foodSpoiled', 'goodsUsed', 'coop', 'conflict', 'share', 'trades', 'foodPrice', 'goodsPrice', 'friends', 'enemies'];
    fs.writeFileSync(`/workspace/micro-society/qa/sample-${TAG}.csv`, cols.join(',') + '\n' + rows.map(r => cols.map(c => typeof r[c] === 'number' && !Number.isInteger(r[c]) ? r[c].toFixed(4) : r[c]).join(',')).join('\n') + '\n');
  }
})().catch(e => { console.error('QA FAILED', e); process.exit(1); });

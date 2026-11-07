// 长期运行：人口上限、单步耗时（6 个种子 × 3000 天）
const fs = require('fs');
const { createSim } = new Function(fs.readFileSync(__dirname + '/../src/sim.js', 'utf8') + '; return { createSim };')();
const out = [];
for (const seed of [20261107, 120, 314159, 3, 12345, 2]) {
  const sim = createSim(seed); let peak = 0, mx = 0; const t0 = Date.now(); const big = [];
  for (let d = 1; d <= 3000; d++) { const a = process.hrtime.bigint(); sim.step(); const ms = Number(process.hrtime.bigint() - a) / 1e6; mx = Math.max(mx, ms); const al = sim.S.history.at(-1).alive; peak = Math.max(peak, al); if (al >= 170) big.push(ms); }
  big.sort((a, b) => a - b);
  const H = sim.S.history; const causes = {}; sim.S.people.filter(p => !p.alive).forEach(p => causes[p.cause] = (causes[p.cause] || 0) + 1);
  out.push({ seed, alive1000: H[1000].alive, alive2000: H[2000].alive, alive3000: H[3000].alive, peak, totalMs: Date.now() - t0, maxStepMs: +mx.toFixed(1), medianStepMsAt170plus: big.length ? +big[big.length >> 1].toFixed(2) : null, deaths: causes, gini3000: +H[3000].gini.toFixed(3) });
}
console.log(JSON.stringify(out, null, 1)); fs.writeFileSync(__dirname + '/long3000.json', JSON.stringify(out, null, 1));

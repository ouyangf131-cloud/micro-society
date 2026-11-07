// 30 个种子（100–129，与太仆验收相同）× 1000 天：人口、有钱饿死、现金守恒、价格下限天数
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../src/sim.js', 'utf8');
const { createSim, CONFIG } = new Function(src + '; return { createSim, CONFIG };')();
const DAYS = +process.argv[2] || 1000;
const rows = [];
for (let seed = 100; seed < 130; seed++) {
  const sim = createSim(seed), S = sim.S;
  const cash = () => S.people.reduce((a, p) => a + p.money, 0) + S.pool + S.medFund;
  const c0 = cash(); let maxDrift = 0;
  let starveAdult = 0, starveChild = 0, rich = 0, richMax = 0, foodFloor = 0, goodsFloor = 0, minAlive = 1e9, emergency = 0;
  for (let d = 1; d <= DAYS; d++) {
    const pre = new Map(S.people.map(p => [p.id, p.money]));
    sim.step();
    for (const p of S.people) if (!p.alive && p.deathDay === d && p.cause === '饥饿') {
      if (p.age >= CONFIG.work.adultAge) { starveAdult++; const m = pre.get(p.id); if (m >= 20) { rich++; richMax = Math.max(richMax, m); } } else starveChild++;
    }
    const h = S.history.at(-1);
    if (h.foodPrice <= CONFIG.market.priceMin) foodFloor++;
    if (h.goodsPrice <= CONFIG.market.priceMin) goodsFloor++;
    minAlive = Math.min(minAlive, h.alive); emergency += h.emergency;
    maxDrift = Math.max(maxDrift, Math.abs(cash() - c0));
  }
  const h = S.history.at(-1);
  rows.push({ seed, alive: h.alive, minAlive, dead: h.dead, births: h.births, gini: +h.gini.toFixed(3), starveAdult, starveChild, richStarved: rich, richMax: +richMax.toFixed(1),
    foodFloorPct: +(foodFloor / DAYS * 100).toFixed(1), goodsFloorPct: +(goodsFloor / DAYS * 100).toFixed(1), emergencyUnits: emergency, cashStart: +c0.toFixed(2), maxCashDrift: maxDrift, hash: sim.hash() });
}
const al = rows.map(r => r.alive).sort((a, b) => a - b);
const sum = k => rows.reduce((a, r) => a + r[k], 0);
const summary = { seeds: '100-129', days: DAYS, aliveMin: al[0], aliveMedian: (al[14] + al[15]) / 2, aliveMedianUpper: al[15], aliveMax: al[29], below90: al.filter(x => x < 90).length,
  richStarved: sum('richStarved'), starveAdult: sum('starveAdult'), starveChild: sum('starveChild'), maxCashDrift: Math.max(...rows.map(r => r.maxCashDrift)),
  foodFloorPctAvg: +(sum('foodFloorPct') / 30).toFixed(1), goodsFloorPctAvg: +(sum('goodsFloorPct') / 30).toFixed(1) };
console.log(JSON.stringify(summary));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify({ summary, rows }, null, 1));

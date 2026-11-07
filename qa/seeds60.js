// 太仆复核用的 60 个种子 × 1000 天：人口、医生/商人存续、治疗、伤病死亡、饿死、现金守恒
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../src/sim.js', 'utf8');
const { createSim, CONFIG } = new Function(src + '; return { createSim, CONFIG };')();
const DAYS = +process.argv[2] || 1000;
const SEEDS = [...Array(30).keys()].map(i => 100 + i).concat([20261107, 1, 2, 3, 42, 12345, 999999, 4294967295, 7, 13, 77, 2026, 31337, 8888, 65535, 271828, 314159, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 777777, 123456789]);
const rows = [];
for (const seed of SEEDS) {
  const sim = createSim(seed), S = sim.S;
  const cash = () => S.people.reduce((a, p) => a + p.money, 0) + S.pool + S.medFund;
  const c0 = cash(); let drift = 0, peak = 0, healsAfter100 = 0, starveAdult = 0, starveChild = 0, rich = 0, injury = 0, old = 0, foodFloor = 0, lastDoc = 0, minDocs = 1e9;
  for (let d = 1; d <= DAYS; d++) {
    const pre = new Map(S.people.map(p => [p.id, p.money]));
    sim.step();
    const h = S.history.at(-1);
    peak = Math.max(peak, h.alive); if (d > 100) healsAfter100 += h.heal;
    if (h.foodPrice <= CONFIG.market.priceMin) foodFloor++;
    for (const p of S.people) if (!p.alive && p.deathDay === d) {
      if (p.cause === '饥饿') { if (p.age >= CONFIG.work.adultAge) { starveAdult++; if (pre.get(p.id) >= 20) rich++; } else starveChild++; }
      else if (p.cause === '伤病') injury++; else old++;
    }
    const docs = S.people.filter(p => p.alive && p.age >= CONFIG.work.adultAge && p.job === 'doctor').length;
    if (docs > 0) lastDoc = d; if (d > 100) minDocs = Math.min(minDocs, docs);
    drift = Math.max(drift, Math.abs(cash() - c0));
  }
  const ad = S.people.filter(p => p.alive && p.age >= CONFIG.work.adultAge);
  rows.push({ seed, alive: S.history.at(-1).alive, peak, doctors: ad.filter(p => p.job === 'doctor').length, merchants: ad.filter(p => p.job === 'merchant').length,
    minDoctorsAfter100: minDocs, healsAfter100, injuryDeaths: injury, oldAgeDeaths: old, starveAdult, starveChild, richStarved: rich, foodFloorDays: foodFloor, cashDrift: drift, hash: sim.hash() });
}
const st = (arr) => { const a = arr.slice().sort((x, y) => x - y); return { min: a[0], median: a.length % 2 ? a[a.length >> 1] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2, max: a.at(-1) }; };
const set30 = rows.slice(0, 30);
const summary = {
  days: DAYS, seeds: SEEDS.length,
  alive60: st(rows.map(r => r.alive)), peak60: st(rows.map(r => r.peak)), alive30_100to129: st(set30.map(r => r.alive)),
  seedsWithDoctorAt1000: rows.filter(r => r.doctors > 0).length, doctorsAt1000: st(rows.map(r => r.doctors)), minDoctorsAfter100: st(rows.map(r => r.minDoctorsAfter100)),
  seedsWithHealsAfter100: rows.filter(r => r.healsAfter100 > 0).length, healsAfter100: st(rows.map(r => r.healsAfter100)),
  seedsWithMerchantAt1000: rows.filter(r => r.merchants > 0).length, merchantsAt1000: st(rows.map(r => r.merchants)),
  injuryDeaths: st(rows.map(r => r.injuryDeaths)), oldAgeDeaths: st(rows.map(r => r.oldAgeDeaths)),
  richStarved60: rows.reduce((a, r) => a + r.richStarved, 0), richStarved30: set30.reduce((a, r) => a + r.richStarved, 0),
  starveAdult60: rows.reduce((a, r) => a + r.starveAdult, 0), starveChild60: rows.reduce((a, r) => a + r.starveChild, 0),
  foodFloorDays60: rows.reduce((a, r) => a + r.foodFloorDays, 0), maxCashDrift: Math.max(...rows.map(r => r.cashDrift))
};
console.log(JSON.stringify(summary));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify({ summary, rows }, null, 1));

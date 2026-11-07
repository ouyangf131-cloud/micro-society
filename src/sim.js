/* ===== 模拟引擎：所有规则数值都来自 CONFIG（规则说明也由 CONFIG 生成） ===== */
const CONFIG = {
  population: 100,
  maxPopulation: 300,
  defaultSeed: 20261107,
  jobs: {
    farmer:   { name: '农夫', count: 32, product: 'food',  base: 2.9, variance: 0.2 },
    fisher:   { name: '渔夫', count: 20, product: 'food',  base: 2.7, variance: 0.6 },
    artisan:  { name: '工匠', count: 28, product: 'goods', base: 2.8, variance: 0.2 },
    merchant: { name: '商人', count: 12, product: null,    base: 0,   variance: 0 },
    doctor:   { name: '医生', count: 8,  product: null,    base: 0,   variance: 0 }
  },
  init: { ageMin: 18, ageMax: 62, moneyMedian: 50, moneySpread: 0.6, foodMin: 4, foodMax: 10,
          goodsMin: 2, goodsMax: 5, skillMin: 0.1, skillMax: 0.6, acquaintances: 3, acqRelMin: 10, acqRelMax: 40,
          needMin: 70 },
  needs: { satietyDecay: 30, satietyPerFood: 20, maxFoodPerDay: 3, eatUntil: 90, goodsPerDay: 1,
           restBase: 20, restGoodsBonus: 15, restFedBonus: 10, fedThreshold: 50,
           starveHealthLoss: 15, exhaustedEnergy: 10, exhaustedHealthLoss: 5,
           healthRegen: 3, regenSatiety: 50, regenEnergy: 30 },
  work: { adultAge: 16, energyCost: 30, minEnergy: 20, minHealth: 20, skillFactorBase: 0.6,
          healthWeight: 0.5, skillGain: 0.001, coopBoost: 0.15 },
  market: { foodTarget: 6, foodSellAbove: 8, goodsTarget: 3, goodsSellAbove: 5,
            foodPrice0: 3, goodsPrice0: 4, greedMarkup: 0.3, merchantFee: 0.10,
            priceAdjust: 0.05, priceMin: 0.5, priceMax: 30, tradeRelGain: 1 },
  spoil: { foodRate: 0.03 },
  social: { meetBase: 1, meetExtra: 3, friendPick: 0.5, friendThreshold: 30, enemyThreshold: -30,
            coopBase: 0.20, coopKind: 0.35, coopRel: 0.003,
            conflictBase: 0.02, conflictAggr: 0.12, conflictHunger: 0.10, hungerSatiety: 20,
            conflictEnvy: 0.06, envyRatio: 2, conflictRel: 0.002, maxProb: 0.9,
            coopRelGain: 6, chatRelGain: 1, conflictRelLoss: 20,
            fightHealthW: 0.5, fightEnergyW: 0.3, fightAggrW: 30, fightLuck: 30,
            robRate: 0.15, robMax: 15, loserHealthLoss: 12, winnerHealthLoss: 4,
            shareKind: 0.3, shareNeedFood: 2, shareGiverMin: 6, shareMax: 3, shareRelGain: 8,
            relDecay: 0.995, relForget: 0.5 },
  doctor: { healBelow: 70, healAmount: 25, fee: 6, maxPatients: 3, freeKind: 0.6 },
  life: { oldAge: 65, oldAgeRisk: 0.0004, childFoodPerDay: 2 },
  birth: { enabled: true, minAge: 18, maxAge: 45, partnerRel: 60, minSatiety: 50, minMoney: 30,
           dailyChance: 0.004, cooldown: 300, giftEach: 10, parentRel: 50, traitNoise: 0.3, babySatiety: 80, babyEnergy: 80, babyHealth: 100 },
  welfare: { enabled: true, taxThreshold: 100, taxRate: 0.02, povertyLine: 10 },
  jobSwitch: { every: 30, bottomShare: 0.1, newSkill: 0.2 },
  limits: { historyDays: 5000, logPerDay: 300, personalLog: 12 }
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾萧田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤';
const GIVEN = '安宁浩然子轩雨桐思远嘉怡梓涵晨曦一鸣欣怡俊杰诗琪志强秀英建华丽娟明辉晓燕文博雅静天佑若曦家豪梦瑶宇航佳琪振宇美玲国庆春花海涛凤霞';

function createSim(seed) {
  const C = CONFIG;
  const rng = mulberry32(seed >>> 0);
  const R = () => rng();
  const rint = (a, b) => a + Math.floor(R() * (b - a + 1));
  const rr = (a, b) => a + R() * (b - a);
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };

  const S = {
    seed: seed >>> 0, day: 0, people: [], byId: new Map(), nextId: 1,
    prices: { food: C.market.foodPrice0, goods: C.market.goodsPrice0 },
    totals: { dead: 0, births: 0 }, today: null, log: [], history: [], usedNames: new Set()
  };

  function makeName(surname) {
    for (let k = 0; k < 50; k++) {
      const s = surname || SURNAMES[Math.floor(R() * SURNAMES.length)];
      const g = R() < 0.5 ? GIVEN[Math.floor(R() * GIVEN.length)] : GIVEN[Math.floor(R() * GIVEN.length)] + GIVEN[Math.floor(R() * GIVEN.length)];
      const n = s + g;
      if (!S.usedNames.has(n)) { S.usedNames.add(n); return n; }
    }
    const n = (surname || '无') + '名' + S.nextId; S.usedNames.add(n); return n;
  }

  function newPerson(o) {
    const p = Object.assign({
      id: S.nextId++, name: '', age: 20, job: null, skill: 0.3,
      kind: R(), greed: R(), aggr: R(), social: R(),
      money: 0, food: 0, goods: 0, satiety: 80, energy: 80, health: 90,
      rel: new Map(), alive: true, deathDay: null, cause: '', parents: [], children: [],
      bornDay: 0, coopBuff: false, worked: false, earn: 0, lastBirth: -1e9, plog: []
    }, o);
    S.people.push(p); S.byId.set(p.id, p);
    return p;
  }

  function log(type, text, ids) {
    const t = S.today;
    if (t.log.length < C.limits.logPerDay) t.log.push({ type, text }); else t.logDropped++;
    if (ids) for (const id of ids) {
      const p = S.byId.get(id); if (!p) continue;
      p.plog.push('第' + S.day + '天：' + text);
      if (p.plog.length > C.limits.personalLog) p.plog.shift();
    }
  }

  const getRel = (a, b) => a.rel.get(b.id) || 0;
  function addRel(a, b, d) {
    const old = getRel(a, b);
    const v = clamp(old + d, -100, 100);
    a.rel.set(b.id, v); b.rel.set(a.id, v);
    const F = C.social.friendThreshold, E = C.social.enemyThreshold;
    if (old < F && v >= F) { S.today.newFriends++; log('rel', a.name + ' 和 ' + b.name + ' 成为朋友', [a.id, b.id]); }
    else if (old >= F && v < F) { S.today.brokenFriends++; log('rel', a.name + ' 和 ' + b.name + ' 友谊破裂', [a.id, b.id]); }
    if (old > E && v <= E) { S.today.newEnemies++; log('rel', a.name + ' 和 ' + b.name + ' 结仇', [a.id, b.id]); }
  }

  const isAdult = p => p.alive && p.age >= C.work.adultAge;
  const wealth = p => p.money + p.food * S.prices.food + p.goods * S.prices.goods;

  // ---------- 初始化 ----------
  const jobKeys = Object.keys(C.jobs);
  const jobList = [];
  for (const k of jobKeys) for (let i = 0; i < C.jobs[k].count; i++) jobList.push(k);
  while (jobList.length < C.population) jobList.push(jobKeys[0]);
  shuffle(jobList);
  for (let i = 0; i < C.population; i++) {
    const I = C.init;
    newPerson({
      name: makeName(), age: rr(I.ageMin, I.ageMax), job: jobList[i], skill: rr(I.skillMin, I.skillMax),
      money: Math.round(I.moneyMedian * Math.exp(I.moneySpread * gauss()) * 100) / 100,
      food: rint(I.foodMin, I.foodMax), goods: rint(I.goodsMin, I.goodsMax),
      satiety: rr(I.needMin, 100), energy: rr(I.needMin, 100), health: rr(I.needMin + 10, 100)
    });
  }
  S.today = newToday();
  for (const p of S.people) {
    for (let k = 0; k < C.init.acquaintances; k++) {
      const q = S.people[Math.floor(R() * S.people.length)];
      if (q !== p) { const v = rr(C.init.acqRelMin, C.init.acqRelMax); p.rel.set(q.id, v); q.rel.set(p.id, v); }
    }
  }
  S.log = [];
  record();

  function newToday() {
    return { trades: 0, coop: 0, conflict: 0, share: 0, heal: 0, foodEaten: 0, goodsUsed: 0, foodProduced: 0,
      goodsProduced: 0, foodSpoiled: 0, deaths: 0, births: 0, newFriends: 0, brokenFriends: 0, newEnemies: 0, taxed: 0, aided: 0,
      log: [], logDropped: 0 };
  }

  function gini(vals) {
    const n = vals.length; if (n < 2) return 0;
    const v = vals.map(x => Math.max(0, x)).sort((a, b) => a - b);
    let sum = 0, cum = 0;
    for (let i = 0; i < n; i++) { sum += v[i]; cum += (i + 1) * v[i]; }
    if (sum <= 0) return 0;
    return (2 * cum) / (n * sum) - (n + 1) / n;
  }

  function record() {
    const alive = S.people.filter(p => p.alive);
    const w = alive.map(wealth);
    let friends = 0, enemies = 0;
    for (const p of alive) for (const [id, v] of p.rel) { if (id > p.id) { const q = S.byId.get(id); if (q && q.alive) { if (v >= C.social.friendThreshold) friends++; else if (v <= C.social.enemyThreshold) enemies++; } } }
    const t = S.today;
    S.history.push({
      day: S.day, alive: alive.length, dead: S.totals.dead, births: S.totals.births,
      gini: gini(w), totalWealth: w.reduce((a, b) => a + b, 0), totalMoney: alive.reduce((a, p) => a + p.money, 0),
      foodStock: alive.reduce((a, p) => a + p.food, 0), goodsStock: alive.reduce((a, p) => a + p.goods, 0),
      foodEaten: t.foodEaten, goodsUsed: t.goodsUsed, foodProduced: t.foodProduced, goodsProduced: t.goodsProduced,
      foodSpoiled: t.foodSpoiled, coop: t.coop, conflict: t.conflict, share: t.share, trades: t.trades, heal: t.heal, taxed: t.taxed, aided: t.aided,
      foodPrice: S.prices.food, goodsPrice: S.prices.goods, friends, enemies
    });
    if (S.history.length > C.limits.historyDays) S.history.splice(1, 1); // 保留第0天，丢弃最早的
    S.log = t.log; S.logDropped = t.logDropped;
  }

  // ---------- 每日阶段 ----------
  function phaseWork() {
    const W = C.work;
    for (const p of S.people) {
      p.worked = false;
      if (!isAdult(p)) continue;
      if (p.energy < W.minEnergy || p.health < W.minHealth) continue;
      p.worked = true; p.energy -= W.energyCost;
      const J = C.jobs[p.job];
      if (J.product) {
        const out = J.base * (W.skillFactorBase + p.skill) * (1 - W.healthWeight + W.healthWeight * p.health / 100)
          * (p.coopBuff ? 1 + W.coopBoost : 1) * (1 - J.variance + 2 * J.variance * R());
        p[J.product] += out;
        if (J.product === 'food') S.today.foodProduced += out; else S.today.goodsProduced += out;
      }
      p.skill = Math.min(1, p.skill + W.skillGain);
      p.coopBuff = false;
    }
  }

  function phaseDoctor() {
    const D = C.doctor;
    const docs = S.people.filter(p => p.worked && p.job === 'doctor');
    if (!docs.length) return;
    const patients = S.people.filter(p => p.alive && p.health < D.healBelow).sort((a, b) => a.health - b.health || a.id - b.id);
    let i = 0;
    for (const d of docs) {
      let n = 0;
      while (n < D.maxPatients && i < patients.length) {
        const pt = patients[i++];
        if (pt === d) continue;
        if (pt.money >= D.fee) { pt.money -= D.fee; d.money += D.fee; d.earn += D.fee; }
        else if (d.kind <= D.freeKind) continue;
        pt.health = Math.min(100, pt.health + D.healAmount); n++; S.today.heal++;
        log('heal', d.name + '（医生）为 ' + pt.name + ' 治疗', [d.id, pt.id]);
      }
    }
  }

  function phaseMarket(kind) {
    const M = C.market;
    const target = kind === 'food' ? M.foodTarget : M.goodsTarget;
    const sellAbove = kind === 'food' ? M.foodSellAbove : M.goodsSellAbove;
    const price = S.prices[kind];
    const merchants = S.people.filter(p => p.worked && p.job === 'merchant');
    const fee = merchants.length ? M.merchantFee : 0;
    const sellers = S.people.filter(p => isAdult(p) && p[kind] > sellAbove)
      .map(p => ({ p, ask: price * (1 + M.greedMarkup * p.greed), qty: Math.floor(p[kind] - sellAbove) }))
      .sort((a, b) => a.ask - b.ask || a.p.id - b.p.id);
    const buyers = shuffle(S.people.filter(p => isAdult(p) && p[kind] < target));
    let supply = sellers.reduce((a, s) => a + s.qty, 0), demand = 0, pool = 0, units = 0;
    for (const b of buyers) {
      let need = Math.ceil(target - b[kind]); demand += need;
      for (const s of sellers) {
        if (need <= 0) break;
        if (s.qty <= 0) continue;
        const unit = s.ask * (1 + fee);
        const q = Math.min(need, s.qty, Math.floor(b.money / unit));
        if (q <= 0) break;
        b.money -= q * unit; s.p.money += q * s.ask; s.p.earn += q * s.ask; pool += q * s.ask * fee;
        b[kind] += q; s.p[kind] -= q; s.qty -= q; need -= q; units += q;
        S.today.trades++;
        addRel(b, s.p, M.tradeRelGain);
      }
    }
    if (merchants.length && pool > 0) { const each = pool / merchants.length; for (const m of merchants) { m.money += each; m.earn += each; } }
    if (demand + supply > 0) S.prices[kind] = clamp(price * (1 + M.priceAdjust * (demand - supply) / (demand + supply)), M.priceMin, M.priceMax);
    if (units > 0) log('trade', (kind === 'food' ? '食物' : '物品') + '市场成交 ' + units + ' 单位，新价格 ' + S.prices[kind].toFixed(2) + ' 元');
  }

  function pickPartner(a, adults) {
    const SC = C.social;
    if (R() < SC.friendPick) {
      const fr = [];
      for (const [id, v] of a.rel) if (v >= SC.friendThreshold) { const q = S.byId.get(id); if (q && isAdult(q)) fr.push(q); }
      if (fr.length) { fr.sort((x, y) => x.id - y.id); return fr[Math.floor(R() * fr.length)]; }
    }
    if (adults.length < 2) return null;
    let b; do { b = adults[Math.floor(R() * adults.length)]; } while (b === a);
    return b;
  }

  function phaseSocial() {
    const SC = C.social;
    const adults = S.people.filter(isAdult);
    const wealthCache = new Map(adults.map(p => [p.id, wealth(p)]));
    for (const a of shuffle(adults.slice())) {
      const meets = SC.meetBase + Math.round(a.social * SC.meetExtra);
      for (let k = 0; k < meets; k++) {
        if (!a.alive) break;
        const b = pickPartner(a, adults);
        if (!b || !b.alive) continue;
        const r = getRel(a, b);
        // 分享：对方缺粮、自己有余粮、自己足够善良、关系不是负数
        if (b.food < SC.shareNeedFood && a.food > SC.shareGiverMin && a.kind > SC.shareKind && r >= 0) {
          const g = Math.min(SC.shareMax, Math.floor(a.food - SC.shareGiverMin));
          if (g > 0) { a.food -= g; b.food += g; S.today.share++; addRel(a, b, SC.shareRelGain);
            log('share', a.name + ' 分给 ' + b.name + ' ' + g + ' 份食物', [a.id, b.id]); }
        }
        const wa = wealthCache.get(a.id), wb = wealthCache.get(b.id);
        const pConf = clamp(SC.conflictBase + SC.conflictAggr * (a.aggr + b.aggr) / 2
          + (a.satiety < SC.hungerSatiety ? SC.conflictHunger : 0)
          + (wb > SC.envyRatio * wa ? SC.conflictEnvy * a.greed : 0) - SC.conflictRel * r, 0, SC.maxProb);
        const pCoop = clamp(SC.coopBase + SC.coopKind * (a.kind + b.kind) / 2 + SC.coopRel * r, 0, SC.maxProb);
        const u = R();
        if (u < pConf) {
          const sa = a.health * SC.fightHealthW + a.energy * SC.fightEnergyW + a.aggr * SC.fightAggrW + R() * SC.fightLuck;
          const sb = b.health * SC.fightHealthW + b.energy * SC.fightEnergyW + b.aggr * SC.fightAggrW + R() * SC.fightLuck;
          const win = sa >= sb ? a : b, lose = win === a ? b : a;
          const loot = Math.min(lose.money * SC.robRate, SC.robMax);
          lose.money -= loot; win.money += loot;
          lose.health -= SC.loserHealthLoss; win.health -= SC.winnerHealthLoss;
          addRel(a, b, -SC.conflictRelLoss); S.today.conflict++;
          log('conflict', a.name + ' 与 ' + b.name + ' 发生冲突，' + win.name + ' 占上风，抢走 ' + loot.toFixed(1) + ' 元', [a.id, b.id]);
        } else if (u < pConf + pCoop) {
          a.coopBuff = true; b.coopBuff = true; addRel(a, b, SC.coopRelGain); S.today.coop++;
          log('coop', a.name + ' 与 ' + b.name + ' 合作干活（明天产量 +' + Math.round(C.work.coopBoost * 100) + '%）', [a.id, b.id]);
        } else {
          addRel(a, b, SC.chatRelGain);
        }
      }
    }
  }

  function phaseFeedChildren() {
    const L = C.life, SC = C.social;
    for (const c of S.people) {
      if (!c.alive || c.age >= C.work.adultAge) continue;
      let need = L.childFoodPerDay;
      const carers = c.parents.map(id => S.byId.get(id)).filter(p => p && p.alive).sort((a, b) => b.food - a.food);
      if (!carers.length) {
        const g = S.people.filter(p => isAdult(p) && p.kind > SC.shareKind && p.food > SC.shareGiverMin).sort((a, b) => b.food - a.food || a.id - b.id)[0];
        if (g) carers.push(g);
      }
      for (const p of carers) { const g = Math.min(need, Math.floor(p.food)); if (g > 0) { p.food -= g; c.food += g; need -= g; } if (need <= 0) break; }
    }
  }

  function phaseConsume() {
    const N = C.needs;
    for (const p of S.people) {
      if (!p.alive) continue;
      p.satiety -= N.satietyDecay;
      let eaten = 0;
      while (p.satiety < N.eatUntil && eaten < N.maxFoodPerDay && p.food >= 1) { p.food -= 1; p.satiety += N.satietyPerFood; eaten++; }
      S.today.foodEaten += eaten;
      p.satiety = clamp(p.satiety, 0, 100);
      let used = false;
      if (p.age >= C.work.adultAge && p.goods >= N.goodsPerDay) { p.goods -= N.goodsPerDay; used = true; S.today.goodsUsed += N.goodsPerDay; }
      p.energy = clamp(p.energy + N.restBase + (used ? N.restGoodsBonus : 0) + (p.satiety > N.fedThreshold ? N.restFedBonus : 0), 0, 100);
      if (p.satiety <= 0) p.health -= N.starveHealthLoss;
      if (p.energy < N.exhaustedEnergy) p.health -= N.exhaustedHealthLoss;
      if (p.satiety > N.regenSatiety && p.energy > N.regenEnergy) p.health += N.healthRegen;
      p.health = Math.min(100, p.health);
      const sp = p.food * C.spoil.foodRate; p.food -= sp; S.today.foodSpoiled += sp;
    }
  }

  function die(p, cause) {
    p.alive = false; p.deathDay = S.day; p.cause = cause; S.totals.dead++; S.today.deaths++;
    let heir = p.children.map(id => S.byId.get(id)).find(q => q && q.alive);
    if (!heir) { let best = 0; for (const [id, v] of p.rel) { const q = S.byId.get(id); if (q && q.alive && v > best) { best = v; heir = q; } } }
    const w = p.money.toFixed(1);
    if (heir) { heir.money += p.money; heir.food += p.food; heir.goods += p.goods; }
    p.money = 0; p.food = 0; p.goods = 0;
    log('death', p.name + ' 去世（' + cause + '）' + (heir ? '，遗产 ' + w + ' 元由 ' + heir.name + ' 继承' : '，无人继承，遗产散失'), [p.id].concat(heir ? [heir.id] : []));
  }

  function phaseDeath() {
    const L = C.life;
    for (const p of S.people) {
      if (!p.alive) continue;
      if (p.health <= 0) die(p, p.satiety <= 0 ? '饥饿' : '伤病');
      else if (p.age > L.oldAge && R() < L.oldAgeRisk * (p.age - L.oldAge)) die(p, '年老');
    }
  }

  function phaseBirth() {
    const B = C.birth;
    if (!B.enabled) return;
    let alive = S.people.reduce((a, p) => a + (p.alive ? 1 : 0), 0);
    const cands = S.people.filter(p => p.alive && p.age >= B.minAge && p.age <= B.maxAge);
    for (const a of cands) {
      if (alive >= C.maxPopulation) break;
      for (const [id, v] of a.rel) {
        if (id <= a.id || v < B.partnerRel) continue;
        const b = S.byId.get(id);
        if (!b || !b.alive || b.age < B.minAge || b.age > B.maxAge) continue;
        if (a.satiety < B.minSatiety || b.satiety < B.minSatiety || a.money + b.money < B.minMoney) continue;
        if (S.day - a.lastBirth < B.cooldown || S.day - b.lastBirth < B.cooldown) continue;
        if (R() >= B.dailyChance) continue;
        const mix = (x, y) => clamp((x + y) / 2 + (R() - 0.5) * B.traitNoise, 0, 1);
        const ga = Math.min(B.giftEach, a.money), gb = Math.min(B.giftEach, b.money);
        a.money -= ga; b.money -= gb;
        const c = newPerson({ name: makeName(a.name[0]), age: 0, job: a.job, skill: 0, money: ga + gb,
          kind: mix(a.kind, b.kind), greed: mix(a.greed, b.greed), aggr: mix(a.aggr, b.aggr), social: mix(a.social, b.social),
          satiety: B.babySatiety, energy: B.babyEnergy, health: B.babyHealth, parents: [a.id, b.id], bornDay: S.day });
        a.children.push(c.id); b.children.push(c.id); a.lastBirth = b.lastBirth = S.day;
        c.rel.set(a.id, B.parentRel); a.rel.set(c.id, B.parentRel); c.rel.set(b.id, B.parentRel); b.rel.set(c.id, B.parentRel);
        S.totals.births++; S.today.births++; alive++;
        log('birth', a.name + ' 和 ' + b.name + ' 的孩子 ' + c.name + ' 出生', [a.id, b.id, c.id]);
      }
    }
  }

  function phaseWelfare() {
    const Wf = C.welfare;
    if (!Wf.enabled) return;
    const adults = S.people.filter(isAdult);
    let pot = 0;
    for (const p of adults) if (p.money > Wf.taxThreshold) { const t = (p.money - Wf.taxThreshold) * Wf.taxRate; p.money -= t; pot += t; }
    const poor = adults.filter(p => p.money < Wf.povertyLine);
    S.today.taxed = pot;
    if (pot <= 0) return;
    if (!poor.length) { const each = pot / adults.length; for (const p of adults) p.money += each; return; }
    const each = pot / poor.length;
    for (const p of poor) p.money += each;
    S.today.aided = poor.length;
    log('welfare', '公共救济：向富人收税 ' + pot.toFixed(1) + ' 元，平均发给 ' + poor.length + ' 位穷人（每人 ' + each.toFixed(2) + ' 元）');
  }

  function phaseJobSwitch() {
    const J = C.jobSwitch;
    if (S.day % J.every !== 0) return;
    const adults = S.people.filter(isAdult);
    const sum = {}, cnt = {};
    for (const k of jobKeys) { sum[k] = 0; cnt[k] = 0; }
    for (const p of adults) { sum[p.job] += p.earn; cnt[p.job]++; }
    let best = null, bestAvg = -1;
    for (const k of jobKeys) { const avg = cnt[k] ? sum[k] / cnt[k] : 0; if (avg > bestAvg) { bestAvg = avg; best = k; } }
    const sorted = adults.slice().sort((a, b) => wealth(a) - wealth(b) || a.id - b.id);
    const n = Math.floor(sorted.length * J.bottomShare);
    for (let i = 0; i < n; i++) {
      const p = sorted[i];
      if (p.job !== best) { log('job', p.name + ' 从' + C.jobs[p.job].name + '转行做' + C.jobs[best].name, [p.id]); p.job = best; p.skill = J.newSkill; }
    }
    for (const p of adults) p.earn = 0;
  }

  function phaseAging() {
    for (const p of S.people) if (p.alive) {
      const wasChild = p.age < C.work.adultAge;
      p.age += 1 / 365;
      if (wasChild && p.age >= C.work.adultAge) log('job', p.name + ' 成年，开始做' + C.jobs[p.job].name, [p.id]);
    }
  }

  function phaseDecay() {
    const d = C.social.relDecay;
    for (const p of S.people) {
      if (!p.alive) { if (p.rel.size) p.rel.clear(); continue; }
      for (const [id, v] of p.rel) {
        const q = S.byId.get(id);
        if (!q || !q.alive) { p.rel.delete(id); continue; }
        const nv = v * d;
        if (Math.abs(nv) < C.social.relForget) p.rel.delete(id); else p.rel.set(id, nv);
      }
    }
  }

  function step() {
    S.day++;
    S.today = newToday();
    phaseWelfare(); phaseWork(); phaseDoctor(); phaseMarket('food'); phaseMarket('goods'); phaseSocial();
    phaseFeedChildren(); phaseConsume(); phaseDeath(); phaseBirth(); phaseAging(); phaseJobSwitch(); phaseDecay();
    record();
  }

  function hash() {
    let h = 0x811c9dc5;
    const add = s => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } };
    add(S.day + '|' + S.prices.food.toFixed(6) + '|' + S.prices.goods.toFixed(6));
    for (const p of S.people) add([p.id, p.name, p.job, p.alive ? 1 : 0, p.money.toFixed(6), p.food.toFixed(6), p.goods.toFixed(6), p.health.toFixed(6), p.rel.size].join(','));
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  return { S, step, hash, wealth, gini, isAdult };
}

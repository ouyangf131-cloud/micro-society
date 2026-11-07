/* ===== 界面 ===== */
(function () {
  const C = CONFIG;
  const $ = id => document.getElementById(id);
  const fmt = (x, d = 0) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('zh-CN', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pct = x => +(x * 100).toFixed(2) + '%';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const COLORS = { a: '#2f6f5e', b: '#c0563f', c: '#d79b2b', d: '#4a78b5', e: '#8a62b0' };
  const TAGS = { trade: ['交易', '#4a78b5'], coop: ['合作', '#2f6f5e'], share: ['分享', '#5f9e6e'], conflict: ['冲突', '#c0563f'],
    rel: ['关系', '#8a62b0'], heal: ['治疗', '#3b8ea5'], welfare: ['救济', '#d79b2b'], birth: ['出生', '#e07a9a'], death: ['死亡', '#555'], job: ['职业', '#8b7a55'] };

  let sim, timer = null, tab = 'charts', stepTimes = [], lastHashAt = 0;
  const params = new URLSearchParams(location.search);
  let seed = params.has('seed') && /^\d+$/.test(params.get('seed')) ? (Number(params.get('seed')) >>> 0) : C.defaultSeed;

  function reset(s) {
    stop();
    seed = s >>> 0; sim = createSim(seed); stepTimes = [];
    $('btnRun').textContent = '▶ 自动运行';
    $('seedInput').value = seed;
    renderAll();
  }

  function stepDays(n) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) sim.step();
    const dt = performance.now() - t0;
    stepTimes.push(dt / n); if (stepTimes.length > 50) stepTimes.shift();
    renderAll();
    return dt;
  }

  function aliveCount() { return sim.S.history[sim.S.history.length - 1].alive; }

  function start() {
    if (timer) return;
    const sp = Number($('speed').value);
    const perTick = sp > 20 ? Math.round(sp / 20) : 1;
    const interval = sp > 20 ? 50 : 1000 / sp;
    timer = setInterval(() => { if (aliveCount() === 0) { stop(); return; } stepDays(perTick); }, interval);
    $('btnRun').textContent = '⏸ 暂停';
  }
  function stop() { const was = !!timer; if (timer) clearInterval(timer); timer = null; if (was && sim) $('hashLabel').textContent = sim.hash(); const b = $('btnRun'); if (b) b.textContent = sim && sim.S.day > 0 ? '▶ 继续运行' : '▶ 自动运行'; }

  // ---------- 渲染 ----------
  function renderAll() {
    const S = sim.S, h = S.history[S.history.length - 1];
    $('dayLabel').textContent = '第 ' + S.day + ' 天';
    const avg = stepTimes.length ? stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length : 0;
    $('perfLabel').textContent = stepTimes.length ? '每天计算约 ' + avg.toFixed(2) + ' 毫秒' : '';
    // 指纹覆盖全部状态，计算稍慢：自动运行时最多每秒更新一次，暂停或单步时立即更新
    const now = performance.now();
    if (!timer || now - lastHashAt > 1000) { $('hashLabel').textContent = sim.hash(); lastHashAt = now; }
    const st = [
      ['在世', h.alive], ['累计去世', h.dead], ['累计出生', h.births], ['基尼系数', h.gini.toFixed(3)],
      ['总财富', fmt(h.totalWealth)], ['今日合作', h.coop], ['今日冲突', h.conflict], ['今日分享', h.share],
      ['今日成交', h.trades], ['今日吃掉食物', h.foodEaten], ['食物价', h.foodPrice.toFixed(2)], ['物品价', h.goodsPrice.toFixed(2)]
    ];
    $('stats').innerHTML = st.map(x => '<div class="stat"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>').join('');
    if (tab === 'charts') renderCharts();
    if (tab === 'people') renderPeople();
    if (tab === 'log') renderLog();
    if ($('sheet').classList.contains('show') && openId) renderDetail(openId);
  }

  function setupCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = cv.clientWidth || 300, hgt = cv.clientHeight || 190;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hgt * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hgt * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, hgt);
    return { ctx, w, h: hgt };
  }
  function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  function axisLabel(v) { return Math.abs(v) >= 10000 ? (v / 10000).toFixed(v % 10000 ? 1 : 0) + '万' : (Math.abs(v) < 10 && v % 1 ? v.toFixed(2) : String(Math.round(v))); }

  function lineChart(cv, series, opt = {}) {
    const { ctx, w, h } = setupCanvas(cv);
    const H = opt.skip0 && sim.S.history.length > 1 ? sim.S.history.slice(1) : sim.S.history, n = H.length;
    const L = 40, Rm = 8, T = 8, B = 22, pw = w - L - Rm, ph = h - T - B;
    let ymax = opt.ymax || 0;
    if (!opt.ymax) for (const s of series) for (const r of H) { const v = s.get(r); if (v > ymax) ymax = v; }
    ymax = opt.ymax || niceMax(ymax * 1.05);
    ctx.font = '10px -apple-system,sans-serif'; ctx.fillStyle = '#8a857a'; ctx.strokeStyle = '#ece6d8'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = T + ph - ph * i / 4; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(axisLabel(ymax * i / 4), L - 4, y + 3); }
    const d0 = H[0].day, d1 = Math.max(H[n - 1].day, d0 + 1);
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) { const d = d0 + (d1 - d0) * i / 4; ctx.fillText('第' + Math.round(d) + '天', Math.min(Math.max(L + pw * i / 4, L + 16), L + pw - 16), h - 6); }
    const stepN = Math.max(1, Math.floor(n / (pw * 1.5)));
    for (const s of series) {
      ctx.strokeStyle = s.color; ctx.lineWidth = 1.8; ctx.beginPath();
      let first = true;
      for (let i = 0; i < n; i += stepN) {
        const r = H[i]; const x = L + pw * (r.day - d0) / (d1 - d0); const y = T + ph - ph * Math.min(s.get(r), ymax) / ymax;
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      const r = H[n - 1]; ctx.lineTo(L + pw * (r.day - d0) / (d1 - d0), T + ph - ph * Math.min(s.get(r), ymax) / ymax);
      ctx.stroke();
    }
  }

  function histChart(cv) {
    const { ctx, w, h } = setupCanvas(cv);
    const alive = sim.S.people.filter(p => p.alive).map(sim.wealth);
    const L = 30, Rm = 8, T = 8, B = 30, pw = w - L - Rm, ph = h - T - B;
    ctx.font = '10px -apple-system,sans-serif'; ctx.fillStyle = '#8a857a';
    if (!alive.length) { ctx.fillText('已无在世居民', L + 10, T + 20); return; }
    const top = Math.max(1, ...alive) * 1.0001;
    const stepW = niceMax(top / 10), bins = Math.max(1, Math.ceil(top / stepW)), maxW = stepW * bins;
    const cnt = new Array(bins).fill(0);
    for (const v of alive) cnt[Math.min(bins - 1, Math.floor(Math.max(0, v) / stepW))]++;
    const cmax = niceMax(Math.max(...cnt));
    ctx.strokeStyle = '#ece6d8';
    for (let i = 0; i <= 4; i++) { const y = T + ph - ph * i / 4; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(axisLabel(cmax * i / 4), L - 4, y + 3); }
    const bw = pw / bins;
    for (let i = 0; i < bins; i++) {
      const bh = ph * cnt[i] / cmax; ctx.fillStyle = COLORS.a; ctx.fillRect(L + i * bw + 2, T + ph - bh, bw - 4, bh);
      ctx.fillStyle = '#55524b'; ctx.textAlign = 'center'; if (cnt[i]) ctx.fillText(cnt[i], L + i * bw + bw / 2, T + ph - bh - 3);
    }
    ctx.fillStyle = '#8a857a';
    for (let i = 0; i <= bins; i += (bins > 6 ? 2 : 1)) { ctx.textAlign = i === 0 ? 'left' : i === bins ? 'right' : 'center'; ctx.fillText(axisLabel(maxW * i / bins), L + i * bw, h - 16); }
    ctx.textAlign = 'center'; ctx.fillText('财富（元）', L + pw / 2, h - 3);
  }

  function legend(id, items) { $(id).innerHTML = items.map(s => '<span><i style="background:' + s.color + '"></i>' + s.label + '</span>').join(''); }

  function renderCharts() {
    histChart($('cHist'));
    lineChart($('cGini'), [{ get: r => r.gini, color: COLORS.b }], { ymax: 1 });
    const pop = [{ label: '在世', color: COLORS.a, get: r => r.alive }, { label: '累计去世', color: COLORS.b, get: r => r.dead }, { label: '累计出生', color: COLORS.d, get: r => r.births }];
    legend('lgPop', pop); lineChart($('cPop'), pop);
    const res = [{ label: '吃掉的食物', color: COLORS.a, get: r => r.foodEaten }, { label: '腐坏的食物', color: COLORS.c, get: r => r.foodSpoiled }, { label: '用掉的物品', color: COLORS.d, get: r => r.goodsUsed }, { label: '生产的食物', color: COLORS.e, get: r => r.foodProduced }];
    legend('lgRes', res); lineChart($('cRes'), res, { skip0: true });
    const soc = [{ label: '合作', color: COLORS.a, get: r => r.coop }, { label: '冲突', color: COLORS.b, get: r => r.conflict }, { label: '分享食物', color: COLORS.c, get: r => r.share }];
    legend('lgSoc', soc); lineChart($('cSoc'), soc, { skip0: true });
    const pr = [{ label: '食物价格', color: COLORS.a, get: r => r.foodPrice }, { label: '物品价格', color: COLORS.d, get: r => r.goodsPrice }];
    legend('lgPrice', pr); lineChart($('cPrice'), pr);
  }

  const friendsOf = p => { let n = 0; for (const v of p.rel.values()) if (v >= C.social.friendThreshold) n++; return n; };
  function personality(p) {
    const t = [['善良', p.kind, '热心肠', '冷淡'], ['贪婪', p.greed, '精明贪财', '知足'], ['攻击性', p.aggr, '好斗', '温和'], ['社交性', p.social, '外向', '内向']];
    const out = [];
    for (const x of t) { if (x[1] >= 0.7) out.push(x[2]); else if (x[1] <= 0.3) out.push(x[3]); }
    return out.length ? out.slice(0, 3).join('·') : '中庸';
  }
  function status(p) {
    if (!p.alive) return '第' + p.deathDay + '天去世（' + p.cause + '）';
    if (p.age < C.work.adultAge) return '儿童';
    const s = [];
    if (p.satiety <= C.social.hungerSatiety) s.push('饥饿');
    if (p.health < C.doctor.healBelow) s.push('生病/受伤');
    if (p.energy < C.work.minEnergy) s.push('疲惫');
    return s.join('、') || '正常';
  }

  function renderPeople() {
    const sort = $('sortSel').value, filt = $('filterSel').value;
    let ps = sim.S.people.filter(p => filt === 'all' ? true : filt === 'dead' ? !p.alive : p.alive);
    const W = new Map(ps.map(p => [p.id, sim.wealth(p)]));
    const F = new Map(ps.map(p => [p.id, friendsOf(p)]));
    ps.sort(sort === 'wealth' ? (a, b) => W.get(b.id) - W.get(a.id) : sort === 'poor' ? (a, b) => W.get(a.id) - W.get(b.id)
      : sort === 'health' ? (a, b) => a.health - b.health : sort === 'friends' ? (a, b) => F.get(b.id) - F.get(a.id) : (a, b) => a.id - b.id);
    $('plist').innerHTML = ps.length ? ps.map(p => '<button class="person' + (p.alive ? '' : ' dead') + '" data-id="' + p.id + '"><div style="min-width:0"><div class="nm">' + esc(p.name) + ' <span class="muted">#' + p.id + '</span></div><div class="meta">'
      + (p.age < C.work.adultAge ? '儿童' : C.jobs[p.job].name) + ' · ' + Math.floor(p.age) + '岁 · ' + personality(p) + ' · ' + status(p) + '</div></div><div class="w">' + fmt(W.get(p.id)) + ' 元<br><span class="muted">朋友 ' + F.get(p.id) + '</span></div></button>').join('')
      : '<p class="muted">没有符合条件的居民。</p>';
  }

  function renderLog() {
    const S = sim.S, f = $('logFilter').value;
    const items = S.log.filter(e => f === 'all' || e.type === f);
    $('logHead').textContent = '第 ' + S.day + ' 天共记录 ' + S.log.length + ' 条事件' + (S.logDropped ? '（另有 ' + S.logDropped + ' 条超出每日上限 ' + C.limits.logPerDay + ' 条未记录）' : '') + '。普通闲聊不记录。';
    $('logList').innerHTML = items.length ? items.map(e => '<li><span class="tag" style="background:' + TAGS[e.type][1] + '">' + TAGS[e.type][0] + '</span>' + esc(e.text) + '</li>').join('') : '<li class="muted">' + (S.day === 0 ? '还没开始，点「前进 1 天」。' : '今天没有这类事件。') + '</li>';
  }

  let openId = null;
  function bar(label, v) { return '<div class="kv"><span>' + label + '</span><div class="bar"><i style="width:' + Math.max(0, Math.min(100, v)) + '%"></i></div><span>' + Math.round(v) + '</span></div>'; }
  function renderDetail(id) {
    const p = sim.S.byId.get(id); if (!p) return;
    openId = id;
    const rels = [...p.rel.entries()].map(([k, v]) => [sim.S.byId.get(k), v]).filter(x => x[0]);
    const fr = rels.filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const en = rels.filter(x => x[1] < 0).sort((a, b) => a[1] - b[1]).slice(0, 6);
    const chip = ([q, v]) => '<button data-id="' + q.id + '">' + esc(q.name) + ' ' + (v > 0 ? '+' : '') + Math.round(v) + '</button>';
    const fam = p.parents.concat(p.children).map(k => sim.S.byId.get(k)).filter(Boolean);
    $('panel').innerHTML =
      '<div class="phead"><h2>' + esc(p.name) + ' <span class="muted">#' + p.id + '</span></h2><button id="btnClose" aria-label="关闭">✕ 关闭</button></div>'
      + '<p class="muted" style="margin:2px 0 8px">' + (p.age < C.work.adultAge ? '儿童（' + C.work.adultAge + ' 岁成年后做' + C.jobs[p.job].name + '）' : C.jobs[p.job].name) + ' · ' + p.age.toFixed(1) + ' 岁 · 性格：' + personality(p) + ' · 状态：' + status(p) + '</p>'
      + '<div class="grid2"><div>现金<br><b>' + fmt(p.money, 1) + ' 元</b></div><div>总财富<br><b>' + fmt(sim.wealth(p), 1) + ' 元</b></div><div>食物<br><b>' + fmt(p.food, 1) + ' 份</b></div><div>物品（柴火/工具）<br><b>' + fmt(p.goods, 1) + ' 件</b></div><div>技能熟练度<br><b>' + pct(p.skill) + '</b></div><div>今日' + (p.worked ? '已工作' : '未工作') + (p.coopBuff ? '<br><b>明天有合作加成</b>' : '') + '</div></div>'
      + '<h3 style="font-size:15px;margin:12px 0 2px">生存需求</h3>' + bar('饱食度', p.satiety) + bar('体力', p.energy) + bar('健康', p.health)
      + '<h3 style="font-size:15px;margin:12px 0 2px">性格（0–100）</h3>' + bar('善良', p.kind * 100) + bar('贪婪', p.greed * 100) + bar('攻击性', p.aggr * 100) + bar('社交性', p.social * 100)
      + '<h3 style="font-size:15px;margin:12px 0 4px">朋友 / 好感（点名字跳转）</h3><div class="chips">' + (fr.map(chip).join('') || '<span class="muted">暂无</span>') + '</div>'
      + '<h3 style="font-size:15px;margin:12px 0 4px">不和 / 仇人</h3><div class="chips">' + (en.map(chip).join('') || '<span class="muted">暂无</span>') + '</div>'
      + (fam.length ? '<h3 style="font-size:15px;margin:12px 0 4px">家人</h3><div class="chips">' + fam.map(q => '<button data-id="' + q.id + '">' + esc(q.name) + (p.parents.includes(q.id) ? '（父母）' : '（孩子）') + (q.alive ? '' : '†') + '</button>').join('') + '</div>' : '')
      + '<h3 style="font-size:15px;margin:12px 0 4px">最近经历（最多 ' + C.limits.personalLog + ' 条）</h3><ul class="logl">' + (p.plog.slice().reverse().map(t => '<li>' + esc(t) + '</li>').join('') || '<li class="muted">暂无</li>') + '</ul>';
  }
  function openDetail(id) { renderDetail(id); $('sheet').classList.add('show'); $('panel').scrollTop = 0; }
  function closeDetail() { $('sheet').classList.remove('show'); openId = null; }

  // ---------- 规则说明（由 CONFIG 生成） ----------
  function renderRules() {
    const J = C.jobs, N = C.needs, W = C.work, M = C.market, SC = C.social, D = C.doctor, L = C.life, B = C.birth, Wf = C.welfare, JS = C.jobSwitch, I = C.init, E = C.emergency;
    const jobRows = Object.keys(J).map(k => {
      const j = J[k];
      const what = j.product === 'food' ? '生产食物' : j.product === 'goods' ? '生产物品' : k === 'merchant' ? '市场抽成' : '给人治病收费';
      return '<tr><td>' + j.name + '</td><td>' + j.count + '</td><td>' + what + '</td><td>' + (j.product ? j.base : '—') + '</td><td>' + (j.product ? '±' + pct(j.variance) : '—') + '</td></tr>';
    }).join('');
    $('tab-rules').innerHTML = `
<h2 style="margin:0 0 4px;font-size:19px">规则说明</h2>
<p class="muted">下面所有数字都是直接从模拟程序使用的参数对象 <code>CONFIG</code> 读出来的，不是另外手写的，所以和实际运行规则一定一致。没有用任何 AI 接口，全部在你的浏览器里计算。</p>
<h3>1. 基本设定</h3>
<ul>
<li>开局 <b>${C.population}</b> 位居民；在世人数达到 <b>${C.maxPopulation}</b> 人后不再有新生儿。</li>
<li>每位居民有：姓名、年龄、职业与技能熟练度、性格（善良、贪婪、攻击性、社交性，各 0–100）、现金、食物、物品、饱食度、体力、健康，以及和别人的关系分（−100 到 +100）。</li>
<li>每过一天，按顺序发生：<b>公共救济 → 工作 → 看病 → 食物市场 → 物品市场 → 社交（分享/合作/冲突/闲聊） → 喂孩子 → 断粮者紧急买粮 → 吃饭和休息 → 死亡判定 → 出生 → 年龄增长 → 转行（每 ${JS.every} 天） → 关系自然淡化</b>。</li>
<li>财富 = 现金 + 食物 × 当前食物价 + 物品 × 当前物品价。</li>
</ul>
<h3>2. 初始状态</h3>
<ul>
<li>年龄在 ${I.ageMin}–${I.ageMax} 岁之间随机；技能熟练度 ${pct(I.skillMin)}–${pct(I.skillMax)}。</li>
<li>现金服从“对数正态分布”：中位数约 ${I.moneyMedian} 元，离散度 ${I.moneySpread}（所以一开始就有人穷有人富）。</li>
<li>食物 ${I.foodMin}–${I.foodMax} 份，物品 ${I.goodsMin}–${I.goodsMax} 件；饱食度和体力 ${I.needMin}–100，健康 ${I.needMin + 10}–100。</li>
<li>每人随机认识 ${I.acquaintances} 位熟人，关系分 ${I.acqRelMin}–${I.acqRelMax}。</li>
</ul>
<h3>3. 职业与工作</h3>
<table><tr><th>职业</th><th>开局人数</th><th>做什么</th><th>基础产量</th><th>运气波动</th></tr>${jobRows}</table>
<ul>
<li>满 ${W.adultAge} 岁才工作。体力 ≥ ${W.minEnergy} 且健康 ≥ ${W.minHealth} 时当天会去工作，消耗 ${W.energyCost} 体力。</li>
<li>产量 = 基础产量 × (${W.skillFactorBase} + 技能) × (${1 - W.healthWeight} + ${W.healthWeight} × 健康/100) × 合作加成 × 运气。合作加成：前一天和人合作过则 ×${1 + W.coopBoost}（用一次就消失）。</li>
<li>每工作一天技能 +${pct(W.skillGain)}，最高 100%。</li>
<li><b>积压就换活</b>：农夫、渔夫、工匠如果自己手上的本职产品超过 ${W.overStock}，当天改去帮忙做另一种东西（产粮的去做物品，工匠去种粮），产量按对应职业（工匠 / 农夫）基础产量的 ${pct(W.helperRate)} 计算。如果食物和物品都超过 ${W.overStock}，当天就歇着（不耗体力、不长技能）。</li>
<li>商人不生产东西：只要当天有商人工作，所有市场成交都要额外付 ${pct(M.merchantFee)} 手续费，平分给当天工作的商人。</li>
<li>医生见第 6 条。</li>
</ul>
<h3>4. 生存需求（吃饭、休息、健康）</h3>
<ul>
<li>每天饱食度 −${N.satietyDecay}。吃 1 份食物饱食度 +${N.satietyPerFood}（不满 1 份的零头也能吃，按比例加），一天最多吃 ${N.maxFoodPerDay} 份，吃到 ${N.eatUntil} 以上就不吃了。</li>
<li>成年人每天消耗 ${N.goodsPerDay} 件物品（柴火、工具等）。休息恢复体力 = ${N.restBase} + （用了物品再 +${N.restGoodsBonus}） + （饱食度 > ${N.fedThreshold} 再 +${N.restFedBonus}），体力最高 100。</li>
<li>饱食度降到 0：健康 −${N.starveHealthLoss}/天。体力低于 ${N.exhaustedEnergy}：健康 −${N.exhaustedHealthLoss}/天。饱食度 > ${N.regenSatiety} 且体力 > ${N.regenEnergy}：健康 +${N.healthRegen}/天。</li>
<li>存着的食物每天腐坏 ${pct(C.spoil.foodRate)}；物品不会坏。</li>
</ul>
<h3>5. 市场交易（自主买卖）</h3>
<ul>
<li>食物：手上少于 ${M.foodTarget} 份的成年人想买到 ${M.foodTarget} 份。物品：少于 ${M.goodsTarget} 件想买。</li>
<li><b>卖出门槛跟着价格变</b>：门槛 = 四舍五入(基础门槛 × 开局价 ÷ 当前价)，再限制在 ${M.sellAboveMin} 到 基础门槛×${M.sellAboveMaxMult} 之间。食物基础门槛 ${M.foodSellAbove} 份（范围 ${M.sellAboveMin}–${M.foodSellAbove * M.sellAboveMaxMult}），物品 ${M.goodsSellAbove} 件（范围 ${M.sellAboveMin}–${M.goodsSellAbove * M.sellAboveMaxMult}）。也就是：东西越贵，大家越愿意把手上的拿出来卖；越便宜越舍不得卖。手上超过门槛的部分才卖，每人每天每种最多拿出 ${M.maxOfferPerDay} 份/件。</li>
<li>卖家报价 = 当前市价 × (1 + ${M.greedMarkup} × 贪婪度)，越贪越贵。买家随机排队，每人从最便宜的卖家开始买，钱不够就买不了。</li>
<li>每成交一笔，买卖双方关系 +${M.tradeRelGain}。</li>
<li>价格随供需变化：如果拿出来卖的全部卖光了还有人没买到，价格 × (1 + ${M.priceUp} × 没买到的量 ÷ 想买的总量)，也就是缺得越多涨得越快，一天最多涨 ${pct(M.priceUp)}；如果有没卖掉的，价格 × (1 − ${M.priceDown} × 没卖掉的量 ÷ 拿出来卖的总量)。价格限制在 ${M.priceMin}–${M.priceMax} 元之间。开局食物 ${M.foodPrice0} 元/份，物品 ${M.goodsPrice0} 元/件。</li>
<li><b>断粮紧急买粮</b>：喂完孩子之后，任何手上食物少于 ${E.foodBelow} 份的人（包括孩子，最饿的先买）可以向食物至少 ${E.sellerReserve + 1} 份的成年人（存粮最多的先卖）紧急买最多 ${E.buyQty} 份，卖家至少留 ${E.sellerReserve} 份。紧急价 = 当前食物价 × ${1 + E.markup}。钱不够时，可以用物品按“紧急价 ÷ 当前物品价”件换 1 份。</li>
<li>如果断粮的成年人这样还一份粮都弄不到，而且不是产粮职业（农夫、渔夫），就立刻改行做${J[E.switchJob].name}自己种粮，技能从 ${pct(E.switchSkill)} 开始。</li>
</ul>
<h3>6. 医生</h3>
<ul><li>健康低于 ${D.healBelow} 的人按病情从重到轻排队。医生一个接一个看队列，每位当天工作的医生最多治疗 ${D.maxPatients} 人，医生不给自己治。每次健康 +${D.healAmount}，收费 ${D.fee} 元。</li>
<li>病人付不起钱时，只有善良度高于 ${pct(D.freeKind)} 的医生会免费治；不肯免费治的医生会跳过他，但他<b>留在队列里</b>，后面的医生还能看到他。</li></ul>
<h3>7. 社交：分享、合作、冲突、关系</h3>
<ul>
<li>每位成年人每天主动见 ${SC.meetBase} + 四舍五入(社交性 × ${SC.meetExtra}) 个人。有 ${pct(SC.friendPick)} 的机会优先找朋友，否则随机找人。</li>
<li><b>分享</b>：如果对方食物少于 ${SC.shareNeedFood} 份、自己多于 ${SC.shareGiverMin} 份、自己善良度高于 ${pct(SC.shareKind)}、两人关系不是负数，就送对方最多 ${SC.shareMax} 份食物（不会让自己低于 ${SC.shareGiverMin} 份），关系 +${SC.shareRelGain}。</li>
<li>然后按概率决定这次见面是冲突、合作还是闲聊：
<ul>
<li>冲突概率 = ${SC.conflictBase} + ${SC.conflictAggr} × 两人平均攻击性 + （自己饱食度低于 ${SC.hungerSatiety} 时 +${SC.conflictHunger}） + （对方财富超过自己 ${SC.envyRatio} 倍时 +${SC.conflictEnvy} × 自己的贪婪度） − ${SC.conflictRel} × 关系分。</li>
<li>合作概率 = ${SC.coopBase} + ${SC.coopKind} × 两人平均善良度 + ${SC.coopRel} × 关系分。</li>
<li>两种概率都限制在 0–${SC.maxProb}。剩下的情况是闲聊，关系 +${SC.chatRelGain}。</li>
</ul></li>
<li><b>合作</b>：两人一起干活，第二天产量加成（见第 3 条），关系 +${SC.coopRelGain}。</li>
<li><b>冲突</b>：比较 “健康×${SC.fightHealthW} + 体力×${SC.fightEnergyW} + 攻击性×${SC.fightAggrW} + 0~${SC.fightLuck} 的运气”，高者赢。输家被抢走 ${pct(SC.robRate)} 的现金（最多 ${SC.robMax} 元），健康 −${SC.loserHealthLoss}；赢家也受伤，健康 −${SC.winnerHealthLoss}。关系 −${SC.conflictRelLoss}。</li>
<li>关系分 ≥ ${SC.friendThreshold} 算朋友，≤ ${SC.enemyThreshold} 算仇人。跨过这些线时会在事件里记录“成为朋友 / 友谊破裂 / 结仇”。每天所有关系分 × ${SC.relDecay}（慢慢淡化；绝对值小于 ${SC.relForget} 时就忘了对方，关系删除）。</li>
</ul>
<h3>8. 公共救济（资源再分配）</h3>
<ul><li>${Wf.enabled ? '开启。' : '关闭（无人继承的现金会一直留在救济池里）。'}每天开始时，成年人现金超过 ${Wf.taxThreshold} 元的部分收 ${pct(Wf.taxRate)} 的税。税款加上“救济池”里的钱（来自无人继承的遗产，见第 9 条）全部平均发给现金少于 ${Wf.povertyLine} 元的成年人；如果没有穷人，就平均发给所有成年人。</li>
<li>所以全社会的现金总数（所有人的现金 + 救济池）永远不变，钱只会在人和人之间转移。</li></ul>
<h3>9. 死亡与继承</h3>
<ul>
<li>健康降到 0 就会去世：当时饱食度为 0 记作“饥饿”，否则记作“伤病”。</li>
<li>超过 ${L.oldAge} 岁后，每天有 ${L.oldAgeRisk} × (年龄 − ${L.oldAge}) 的概率因年老去世。</li>
<li>遗产（现金、食物、物品）先给在世的孩子，没有孩子就给关系分最高的人（必须大于 0）。都没有时，现金并入救济池（第 8 条），食物和物品散失。</li>
</ul>
<h3>10. 出生（可选规则，当前${B.enabled ? '开启' : '关闭'}）</h3>
<ul>
<li>两位 ${B.minAge}–${B.maxAge} 岁、关系分 ≥ ${B.partnerRel}、饱食度都 ≥ ${B.minSatiety}、两人现金合计 ≥ ${B.minMoney} 元的居民，每天有 ${pct(B.dailyChance)} 的概率生孩子；每人生育后要隔 ${B.cooldown} 天。</li>
<li>父母各给孩子最多 ${B.giftEach} 元。孩子每项性格 = 父母平均值 + 随机（±${B.traitNoise / 2}，限制在 0–1），和父母关系分 ${B.parentRel}；出生时饱食度 ${B.babySatiety}、体力 ${B.babyEnergy}、健康 ${B.babyHealth}。</li>
<li>孩子不工作也不参与社交。每天由父母喂饭（父母都不在了，就由食物多于 ${L.carerMinFood} 份、存粮最多的一位成年人来喂）：把孩子的存粮补到 ${L.childFoodTarget} 份，每天最多给 ${L.childFoodPerDay} 份。孩子存粮超过 ${L.childFoodKeep} 份的部分会还给喂他的大人。</li>
<li>为了在模拟时间里看到新一代，<b>童年被压缩</b>：孩子出生后 ${L.childhoodDays} 天就长到 ${W.adultAge} 岁成年，之后每天按 1/365 岁正常变老。成年后做父母一方的职业。</li>
</ul>
<h3>11. 转行</h3>
<ul><li>每 ${JS.every} 天，统计过去这段时间各职业的平均收入；财富最低的 ${pct(JS.bottomShare)} 成年人改行，技能重置为 ${pct(JS.newSkill)}。</li>
<li>去哪一行：如果这段时间里至少 ${pct(JS.shortageShare)} 的天数食物“卖光了还有人买不到”，就只在产粮职业（农夫、渔夫）里挑平均收入最高的；否则如果物品经常这样缺，就去做工匠；都不缺时，去平均收入最高的职业。</li>
<li>另见第 5 条：断粮又买不到粮的非产粮成年人会立刻改行做${J[E.switchJob].name}。</li></ul>
<h3>12. 统计口径</h3>
<ul>
<li>基尼系数：把在世居民的财富从小到大排序，用标准公式 G = 2Σ(i·xᵢ)/(n·Σxᵢ) − (n+1)/n 计算（负财富按 0 算）。</li>
<li>“今日事件”每天最多记录 ${C.limits.logPerDay} 条（超出部分只计数）；每位居民保留最近 ${C.limits.personalLog} 条经历；图表最多保留 ${C.limits.historyDays} 天历史。</li>
</ul>
<h3>13. 随机种子（可复现）</h3>
<ul><li>所有随机数都由 mulberry32 伪随机算法从“种子”生成，不使用 Math.random。相同种子 + 相同操作 = 完全相同的结果。页面上的“状态指纹”覆盖全部状态：天数、随机数发生器的内部状态、价格、救济池、缺货天数、累计数，以及每位居民的所有字段（含每一条关系分），可以用它核对。网址后面加 <code>?seed=数字</code> 也能指定种子。默认种子 ${C.defaultSeed}。</li></ul>
<details><summary>查看原始参数 CONFIG</summary><pre>${esc(JSON.stringify(C, null, 2))}</pre></details>`;
  }

  // ---------- 事件绑定 ----------
  $('btnStep').onclick = () => { stop(); stepDays(1); };
  $('btnStep30').onclick = () => { stop(); stepDays(30); };
  $('btnRun').onclick = () => { if (timer) stop(); else start(); };
  $('speed').onchange = () => { if (timer) { stop(); start(); } };
  $('btnReset').onclick = () => { const v = $('seedInput').value.trim(); reset(/^\d+$/.test(v) ? Number(v) : seed); };
  $('btnRandSeed').onclick = () => { $('seedInput').value = Math.floor(Math.random() * 1e9); };
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
    tab = b.dataset.tab;
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    for (const t of ['charts', 'people', 'log', 'rules']) $('tab-' + t).classList.toggle('hide', t !== tab);
    renderAll();
    const tabs = document.querySelector('.tabs'); if (tabs.getBoundingClientRect().top < 1) window.scrollTo(0, $('tab-' + tab).offsetTop - tabs.offsetHeight - 8);
  });
  $('sortSel').onchange = renderPeople; $('filterSel').onchange = renderPeople; $('logFilter').onchange = renderLog;
  $('plist').onclick = e => { const b = e.target.closest('[data-id]'); if (b) openDetail(Number(b.dataset.id)); };
  $('panel').onclick = e => { if (e.target.id === 'btnClose') return closeDetail(); const b = e.target.closest('[data-id]'); if (b) openDetail(Number(b.dataset.id)); };
  $('sheet').onclick = e => { if (e.target.id === 'sheet') closeDetail(); };
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (tab === 'charts') renderCharts(); }, 150); });

  renderRules();
  reset(seed);
  window.__ms = { sim: () => sim, stepDays, reset, openDetail, closeDetail, stop };
})();

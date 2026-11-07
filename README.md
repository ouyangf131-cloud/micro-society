# 微型社会模拟器

在线试玩：<https://ouyangf131-cloud.github.io/micro-society/>

一个能在手机浏览器里直接玩的小社会：100 位虚拟居民会自己干活、买卖、合作、吵架、交朋友、分享食物、生孩子，也会因为饥饿、伤病或年老去世。你可以一天一天往前推，也可以让它自动跑，在图表里看贫富差距、人口和资源怎么变化。

- 只有一个 `index.html` 文件，不依赖任何外部库、字体或网络请求。
- 不用任何 AI 接口、API Key 或付费服务，所有计算都在你的浏览器里完成。
- 使用随机种子：相同种子 + 相同操作，结果完全一样。

## 怎么玩

1. 打开上面的网址（iPhone 竖屏可以直接用）。
2. 点 **前进 1 天** 看一天的变化；点 **前进 30 天** 快进一个月。
3. 点 **▶ 自动运行** 让时间自己走，再点一次 **⏸ 暂停**；暂停后再点就是 **继续运行**。可以在“速度”里选每秒 1 / 4 / 15 / 60 天；右上角会显示实际速度（手机较慢时可能达不到标称速度）。
4. **重置**：回到第 0 天。想换一个世界，就改“种子”里的数字（或点 🎲 随机一个），再点重置。也可以在网址后面加 `?seed=12345`。默认种子 20261107。
5. 下方四个标签：
   - **图表**：财富分布直方图、基尼系数（贫富差距）变化、人口（在世/累计去世/累计出生）、每天资源消耗、每天合作/冲突/分享次数、市场价格。
   - **居民**：所有居民列表，可以排序和筛选；点任何人看详情（钱、食物、饱食度、体力、健康、性格、朋友和仇人、家人、最近经历）。
   - **今日事件**：当天发生的交易、合作、冲突、交友/结仇、生病和治疗、救济、出生、死亡、转行。
   - **规则说明**：每条规则和每个参数的白话说明（页面里的数字由程序直接从参数 `CONFIG` 生成）。

## 规则（白话版）

> 本节里所有数字都是 `build.py` 从 `src/sim.js` 的 `CONFIG` 自动填进来的（模板是 `src/README.template.md`），和程序实际用的一样。文末附有全部参数表。

- **居民**：开局 100 人，年龄 18–70 岁。每人有姓名、年龄、职业（农夫、渔夫、工匠、商人、医生）、技能熟练度、四种性格（善良、贪婪、攻击性、社交性）、现金、食物、物品（柴火/工具）、饱食度、体力、健康，以及和别人的关系分（−100 到 +100）。
- **工作**：满 16 岁、体力 ≥ 20、健康 ≥ 10 的人每天工作，消耗 30 体力。农夫（基础产量 2.9）、渔夫（2.7）产食物，工匠（2.8）产物品；产量受技能、健康、运气和“前一天有没有合作”（+15%）影响。
- **积压就换活**：自己的产品超过 12 时，当天改去帮忙做另一种东西，产量按对应职业基础产量的 50%；两样都超过 12 就歇一天。
- **商人和医生**：商人从每笔市场成交中抽 10% 手续费。医生每天最多治 3 位健康低于 70 的人，每次健康 +25，诊费 6 元。
- **生病**：每天每人有 0.1% 的概率生病，健康减少 40–100；如果因此降到 0 以下就当天去世。看病排队按病情从重到轻；病人付不起时先由“医疗基金”代付诊费，基金也不够时，善良度高于 60% 的医生会免费治；被不肯免费治的医生跳过的病人留在队里等下一位医生。
- **吃饭和休息**：饱食度每天 −30，吃 1 份食物 +20（零头也能吃），一天最多吃 3 份。成年人每天用掉 1 件物品，休息得更好。饿到饱食度为 0，健康每天 −15；吃饱睡好健康每天 +3。存着的食物每天腐坏 3%。
- **市场**：食物少于 6 份、物品少于 3 件的成年人去买。卖出门槛跟着价格变：门槛 = 基础门槛 × 开局价 ÷ 当前价，限制在 3 到 基础门槛 × 3 之间（食物基础门槛 8，范围 3–24；物品基础门槛 5，范围 3–15）。每人每天每种最多卖 4。越贪的人卖得越贵（最多贵 30%）。
- **价格**：开局食物 3 元、物品 4 元。卖光了还有人没买到就涨价：× (1 + 0.25 × 没买到的比例)，一天最多涨 25%；卖不完就降价：× (1 − 0.05 × 没卖掉的比例)，一天最多降 5%。价格限制在 0.5–30 元。
- **断粮紧急买粮**：手上不到 1 份粮的人，可以按 1.5 倍价格向至少有 4 份粮的成年人紧急买，每次最多 2 份，卖家至少留 3 份；钱不够还能用物品换。实在弄不到粮的非产粮成年人会改行当农夫（技能 20%），但医生、商人人数已经不超过保底人数时不改行。
- **社交**：每人每天见 1–4 个人（越外向见得越多，50% 的机会优先找朋友）。善良度高于 30% 的人会把余粮（自己留至少 6 份）分给不足 2 份的人，每次最多 3 份。见面时按概率发生冲突（输家被抢走 15% 的现金、最多 15 元，并受伤 −12）、合作或闲聊。关系分 ≥ 30 是朋友，≤ -30 是仇人，每天所有关系分 × 0.995。
- **公共救济与医疗基金**：每天向现金超过 100 元的人收超出部分的 2% 作为税，其中 30% 存进医疗基金（基金最多存 100 元），其余连同“救济池”（无人继承的遗产）一起平均发给现金少于 10 元的人。全社会现金（个人 + 救济池 + 医疗基金）总数永远不变。
- **死亡与继承**：健康降到 0 会去世（饥饿或伤病）；65 岁以后每天有 0.0004 × (年龄 − 65) 的概率因年老去世。遗产给孩子，没有孩子就给关系最好的人；都没有时，现金进救济池。
- **出生**：两位 18–45 岁、关系分 ≥ 60、吃得饱（饱食度 ≥ 50）、合计有 30 元的居民，每天有一定概率生孩子：0.4% × 资源系数（人均存粮 ÷ 6，最高 1）× 拥挤系数（1 − 在世人数 ÷ 180）。生育后要隔 300 天。所以缺粮时生得少，人口会停在 180 以下（硬上限 300）。
- **孩子**：父母各给孩子最多 10 元。孩子由父母喂养：存粮补到 3 份（每天最多给 2 份），多于 6 份会还给家长；父母都不在时，由一位粮多于 3 份的成年人接济。为了在模拟里看到新一代，童年被压缩：出生后第 240 天正好满 16 岁成年。
- **转行**：每 30 天，最穷的 10% 的人会改行。先补足保底职业（医生 4 人、商人 3 人）；然后，如果至少 30% 的天数粮食卖光还有人买不到，就去产粮；物品经常卖光就去做工匠；否则去做最近平均收入最高的职业。改行后技能从 20% 开始。
- **基尼系数**：0 表示人人一样多，1 表示一个人拥有全部财富。

## 文件说明

- `index.html`：游戏本体（由 `src/` 拼成，可以直接打开）。
- `src/sim.js`：模拟引擎和全部参数 `CONFIG`；`src/ui.js`：界面、图表和规则说明生成；`src/template.html`：页面骨架和样式；`src/README.template.md`：本说明的模板。
- `build.py`：`python3 build.py` 生成 `index.html` 和 `README.md`，并把 README 用到的全部参数写进 `qa/readme-values.txt`。
- `qa/`：自动化测试脚本（Playwright、多种子经济测试）、测试结果和数据样例；`shots/`：测试截图。

## 已知限制

- 这是一个简化的“玩具模型”，参数是为了好看、好理解而设定的，不代表真实社会的规律。
- 每天的事件日志最多记录 300 条，普通闲聊不记录；只保留“当天”的日志和每个人最近 12 条经历。
- 页面上的“状态指纹”覆盖全部状态（每位居民所有字段、全部关系分、价格、救济池、医疗基金、随机数状态等），可以用来核对两次运行是否完全一样。
- 童年被压缩成 240 天，是为了让新一代在几年的模拟时间里就能成年，不代表真实。
- 状态不会自动保存，刷新页面会回到第 0 天（但同一个种子会得到同样的结果）。
- 没有在 iPhone 真机 Safari 上测试过，自动测试用的是 Chrome 模拟 iPhone 尺寸。

## 全部参数（CONFIG）

| 参数 | 值 |
|---|---|
| `population` | 100 |
| `maxPopulation` | 300 |
| `defaultSeed` | 20261107 |
| `jobs.farmer.name` | 农夫 |
| `jobs.farmer.count` | 32 |
| `jobs.farmer.product` | food |
| `jobs.farmer.base` | 2.9 |
| `jobs.farmer.variance` | 0.2 |
| `jobs.fisher.name` | 渔夫 |
| `jobs.fisher.count` | 20 |
| `jobs.fisher.product` | food |
| `jobs.fisher.base` | 2.7 |
| `jobs.fisher.variance` | 0.6 |
| `jobs.artisan.name` | 工匠 |
| `jobs.artisan.count` | 28 |
| `jobs.artisan.product` | goods |
| `jobs.artisan.base` | 2.8 |
| `jobs.artisan.variance` | 0.2 |
| `jobs.merchant.name` | 商人 |
| `jobs.merchant.count` | 12 |
| `jobs.merchant.product` | None |
| `jobs.merchant.base` | 0 |
| `jobs.merchant.variance` | 0 |
| `jobs.doctor.name` | 医生 |
| `jobs.doctor.count` | 8 |
| `jobs.doctor.product` | None |
| `jobs.doctor.base` | 0 |
| `jobs.doctor.variance` | 0 |
| `init.ageMin` | 18 |
| `init.ageMax` | 70 |
| `init.moneyMedian` | 50 |
| `init.moneySpread` | 0.6 |
| `init.foodMin` | 4 |
| `init.foodMax` | 10 |
| `init.goodsMin` | 2 |
| `init.goodsMax` | 5 |
| `init.skillMin` | 0.1 |
| `init.skillMax` | 0.6 |
| `init.acquaintances` | 3 |
| `init.acqRelMin` | 10 |
| `init.acqRelMax` | 40 |
| `init.needMin` | 70 |
| `needs.satietyDecay` | 30 |
| `needs.satietyPerFood` | 20 |
| `needs.maxFoodPerDay` | 3 |
| `needs.eatUntil` | 90 |
| `needs.goodsPerDay` | 1 |
| `needs.restBase` | 20 |
| `needs.restGoodsBonus` | 15 |
| `needs.restFedBonus` | 10 |
| `needs.fedThreshold` | 50 |
| `needs.starveHealthLoss` | 15 |
| `needs.exhaustedEnergy` | 10 |
| `needs.exhaustedHealthLoss` | 5 |
| `needs.healthRegen` | 3 |
| `needs.regenSatiety` | 50 |
| `needs.regenEnergy` | 30 |
| `work.adultAge` | 16 |
| `work.energyCost` | 30 |
| `work.minEnergy` | 20 |
| `work.minHealth` | 10 |
| `work.skillFactorBase` | 0.6 |
| `work.healthWeight` | 0.5 |
| `work.skillGain` | 0.001 |
| `work.coopBoost` | 0.15 |
| `work.overStock` | 12 |
| `work.helperRate` | 0.5 |
| `market.foodTarget` | 6 |
| `market.foodSellAbove` | 8 |
| `market.goodsTarget` | 3 |
| `market.goodsSellAbove` | 5 |
| `market.foodPrice0` | 3 |
| `market.goodsPrice0` | 4 |
| `market.greedMarkup` | 0.3 |
| `market.merchantFee` | 0.1 |
| `market.sellAboveMin` | 3 |
| `market.sellAboveMaxMult` | 3 |
| `market.maxOfferPerDay` | 4 |
| `market.priceUp` | 0.25 |
| `market.priceDown` | 0.05 |
| `market.priceMin` | 0.5 |
| `market.priceMax` | 30 |
| `market.tradeRelGain` | 1 |
| `emergency.foodBelow` | 1 |
| `emergency.buyQty` | 2 |
| `emergency.sellerReserve` | 3 |
| `emergency.markup` | 0.5 |
| `emergency.switchJob` | farmer |
| `emergency.switchSkill` | 0.2 |
| `spoil.foodRate` | 0.03 |
| `social.meetBase` | 1 |
| `social.meetExtra` | 3 |
| `social.friendPick` | 0.5 |
| `social.friendThreshold` | 30 |
| `social.enemyThreshold` | -30 |
| `social.coopBase` | 0.2 |
| `social.coopKind` | 0.35 |
| `social.coopRel` | 0.003 |
| `social.conflictBase` | 0.02 |
| `social.conflictAggr` | 0.12 |
| `social.conflictHunger` | 0.1 |
| `social.hungerSatiety` | 20 |
| `social.conflictEnvy` | 0.06 |
| `social.envyRatio` | 2 |
| `social.conflictRel` | 0.002 |
| `social.maxProb` | 0.9 |
| `social.coopRelGain` | 6 |
| `social.chatRelGain` | 1 |
| `social.conflictRelLoss` | 20 |
| `social.fightHealthW` | 0.5 |
| `social.fightEnergyW` | 0.3 |
| `social.fightAggrW` | 30 |
| `social.fightLuck` | 30 |
| `social.robRate` | 0.15 |
| `social.robMax` | 15 |
| `social.loserHealthLoss` | 12 |
| `social.winnerHealthLoss` | 4 |
| `social.shareKind` | 0.3 |
| `social.shareNeedFood` | 2 |
| `social.shareGiverMin` | 6 |
| `social.shareMax` | 3 |
| `social.shareRelGain` | 8 |
| `social.relDecay` | 0.995 |
| `social.relForget` | 0.5 |
| `illness.dailyChance` | 0.001 |
| `illness.damageMin` | 40 |
| `illness.damageMax` | 100 |
| `doctor.healBelow` | 70 |
| `doctor.healAmount` | 25 |
| `doctor.fee` | 6 |
| `doctor.maxPatients` | 3 |
| `doctor.freeKind` | 0.6 |
| `life.oldAge` | 65 |
| `life.oldAgeRisk` | 0.0004 |
| `life.childFoodPerDay` | 2 |
| `life.childFoodTarget` | 3 |
| `life.childFoodKeep` | 6 |
| `life.carerMinFood` | 3 |
| `life.childhoodDays` | 240 |
| `birth.enabled` | true |
| `birth.minAge` | 18 |
| `birth.maxAge` | 45 |
| `birth.partnerRel` | 60 |
| `birth.minSatiety` | 50 |
| `birth.minMoney` | 30 |
| `birth.dailyChance` | 0.004 |
| `birth.foodPerCapitaFull` | 6 |
| `birth.softCap` | 180 |
| `birth.cooldown` | 300 |
| `birth.giftEach` | 10 |
| `birth.parentRel` | 50 |
| `birth.traitNoise` | 0.3 |
| `birth.babySatiety` | 80 |
| `birth.babyEnergy` | 80 |
| `birth.babyHealth` | 100 |
| `welfare.enabled` | true |
| `welfare.taxThreshold` | 100 |
| `welfare.taxRate` | 0.02 |
| `welfare.povertyLine` | 10 |
| `welfare.medicalShare` | 0.3 |
| `welfare.medicalFundCap` | 100 |
| `jobSwitch.every` | 30 |
| `jobSwitch.bottomShare` | 0.1 |
| `jobSwitch.newSkill` | 0.2 |
| `jobSwitch.shortageShare` | 0.3 |
| `jobSwitch.minWorkers.doctor` | 4 |
| `jobSwitch.minWorkers.merchant` | 3 |
| `limits.historyDays` | 5000 |
| `limits.logPerDay` | 300 |
| `limits.personalLog` | 12 |

# 微型社会模拟器

在线试玩：<https://ouyangf131-cloud.github.io/micro-society/>

一个能在手机浏览器里直接玩的小社会：{{population}} 位虚拟居民会自己干活、买卖、合作、吵架、交朋友、分享食物、生孩子，也会因为饥饿、伤病或年老去世。你可以一天一天往前推，也可以让它自动跑，在图表里看贫富差距、人口和资源怎么变化。

- 只有一个 `index.html` 文件，不依赖任何外部库、字体或网络请求。
- 不用任何 AI 接口、API Key 或付费服务，所有计算都在你的浏览器里完成。
- 使用随机种子：相同种子 + 相同操作，结果完全一样。

## 怎么玩

1. 打开上面的网址（iPhone 竖屏可以直接用）。
2. 点 **前进 1 天** 看一天的变化；点 **前进 30 天** 快进一个月。
3. 点 **▶ 自动运行** 让时间自己走，再点一次 **⏸ 暂停**；暂停后再点就是 **继续运行**。可以在“速度”里选每秒 1 / 4 / 15 / 60 天；右上角会显示实际速度（手机较慢时可能达不到标称速度）。
4. **重置**：回到第 0 天。想换一个世界，就改“种子”里的数字（或点 🎲 随机一个），再点重置。也可以在网址后面加 `?seed=12345`。默认种子 {{defaultSeed}}。
5. 下方四个标签：
   - **图表**：财富分布直方图、基尼系数（贫富差距）变化、人口（在世/累计去世/累计出生）、每天资源消耗、每天合作/冲突/分享次数、市场价格。
   - **居民**：所有居民列表，可以排序和筛选；点任何人看详情（钱、食物、饱食度、体力、健康、性格、朋友和仇人、家人、最近经历）。
   - **今日事件**：当天发生的交易、合作、冲突、交友/结仇、生病和治疗、救济、出生、死亡、转行。
   - **规则说明**：每条规则和每个参数的白话说明（页面里的数字由程序直接从参数 `CONFIG` 生成）。

## 规则（白话版）

> 本节里所有数字都是 `build.py` 从 `src/sim.js` 的 `CONFIG` 自动填进来的（模板是 `src/README.template.md`），和程序实际用的一样。文末附有全部参数表。

- **居民**：开局 {{population}} 人，年龄 {{init.ageMin}}–{{init.ageMax}} 岁。每人有姓名、年龄、职业（农夫、渔夫、工匠、商人、医生）、技能熟练度、四种性格（善良、贪婪、攻击性、社交性）、现金、食物、物品（柴火/工具）、饱食度、体力、健康，以及和别人的关系分（−100 到 +100）。
- **工作**：满 {{work.adultAge}} 岁、体力 ≥ {{work.minEnergy}}、健康 ≥ {{work.minHealth}} 的人每天工作，消耗 {{work.energyCost}} 体力。农夫（基础产量 {{jobs.farmer.base}}）、渔夫（{{jobs.fisher.base}}）产食物，工匠（{{jobs.artisan.base}}）产物品；产量受技能、健康、运气和“前一天有没有合作”（+{{work.coopBoost|pct}}）影响。
- **积压就换活**：自己的产品超过 {{work.overStock}} 时，当天改去帮忙做另一种东西，产量按对应职业基础产量的 {{work.helperRate|pct}}；两样都超过 {{work.overStock}} 就歇一天。
- **商人和医生**：商人从每笔市场成交中抽 {{market.merchantFee|pct}} 手续费。医生每天最多治 {{doctor.maxPatients}} 位健康低于 {{doctor.healBelow}} 的人，每次健康 +{{doctor.healAmount}}，诊费 {{doctor.fee}} 元。
- **生病**：每天每人有 {{illness.dailyChance|pct}} 的概率生病，健康减少 {{illness.damageMin}}–{{illness.damageMax}}；如果因此降到 0 以下就当天去世。看病排队按病情从重到轻；病人付不起时先由“医疗基金”代付诊费，基金也不够时，善良度高于 {{doctor.freeKind|pct}} 的医生会免费治；被不肯免费治的医生跳过的病人留在队里等下一位医生。
- **吃饭和休息**：饱食度每天 −{{needs.satietyDecay}}，吃 1 份食物 +{{needs.satietyPerFood}}（零头也能吃），一天最多吃 {{needs.maxFoodPerDay}} 份。成年人每天用掉 {{needs.goodsPerDay}} 件物品，休息得更好。饿到饱食度为 0，健康每天 −{{needs.starveHealthLoss}}；吃饱睡好健康每天 +{{needs.healthRegen}}。存着的食物每天腐坏 {{spoil.foodRate|pct}}。
- **市场**：食物少于 {{market.foodTarget}} 份、物品少于 {{market.goodsTarget}} 件的成年人去买。卖出门槛跟着价格变：门槛 = 基础门槛 × 开局价 ÷ 当前价，限制在 {{market.sellAboveMin}} 到 基础门槛 × {{market.sellAboveMaxMult}} 之间（食物基础门槛 {{market.foodSellAbove}}，范围 {{market.sellAboveMin}}–{{foodSellMax}}；物品基础门槛 {{market.goodsSellAbove}}，范围 {{market.sellAboveMin}}–{{goodsSellMax}}）。每人每天每种最多卖 {{market.maxOfferPerDay}}。越贪的人卖得越贵（最多贵 {{market.greedMarkup|pct}}）。
- **价格**：开局食物 {{market.foodPrice0}} 元、物品 {{market.goodsPrice0}} 元。卖光了还有人没买到就涨价：× (1 + {{market.priceUp}} × 没买到的比例)，一天最多涨 {{market.priceUp|pct}}；卖不完就降价：× (1 − {{market.priceDown}} × 没卖掉的比例)，一天最多降 {{market.priceDown|pct}}。价格限制在 {{market.priceMin}}–{{market.priceMax}} 元。
- **断粮紧急买粮**：手上不到 {{emergency.foodBelow}} 份粮的人，可以按 {{emergencyMult}} 倍价格向至少有 {{emergencySellerMin}} 份粮的成年人紧急买，每次最多 {{emergency.buyQty}} 份，卖家至少留 {{emergency.sellerReserve}} 份；钱不够还能用物品换。实在弄不到粮的非产粮成年人会改行当农夫（技能 {{emergency.switchSkill|pct}}），但医生、商人人数已经不超过保底人数时不改行。
- **社交**：每人每天见 {{social.meetBase}}–{{meetMax}} 个人（越外向见得越多，{{social.friendPick|pct}} 的机会优先找朋友）。善良度高于 {{social.shareKind|pct}} 的人会把余粮（自己留至少 {{social.shareGiverMin}} 份）分给不足 {{social.shareNeedFood}} 份的人，每次最多 {{social.shareMax}} 份。见面时按概率发生冲突（输家被抢走 {{social.robRate|pct}} 的现金、最多 {{social.robMax}} 元，并受伤 −{{social.loserHealthLoss}}）、合作或闲聊。关系分 ≥ {{social.friendThreshold}} 是朋友，≤ {{social.enemyThreshold}} 是仇人，每天所有关系分 × {{social.relDecay}}。
- **公共救济与医疗基金**：每天向现金超过 {{welfare.taxThreshold}} 元的人收超出部分的 {{welfare.taxRate|pct}} 作为税，其中 {{welfare.medicalShare|pct}} 存进医疗基金（基金最多存 {{welfare.medicalFundCap}} 元），其余连同“救济池”（无人继承的遗产）一起平均发给现金少于 {{welfare.povertyLine}} 元的人。全社会现金（个人 + 救济池 + 医疗基金）总数永远不变。
- **死亡与继承**：健康降到 0 会去世（饥饿或伤病）；{{life.oldAge}} 岁以后每天有 {{life.oldAgeRisk}} × (年龄 − {{life.oldAge}}) 的概率因年老去世。遗产给孩子，没有孩子就给关系最好的人；都没有时，现金进救济池。
- **出生**：两位 {{birth.minAge}}–{{birth.maxAge}} 岁、关系分 ≥ {{birth.partnerRel}}、吃得饱（饱食度 ≥ {{birth.minSatiety}}）、合计有 {{birth.minMoney}} 元的居民，每天有一定概率生孩子：{{birth.dailyChance|pct}} × 资源系数（人均存粮 ÷ {{birth.foodPerCapitaFull}}，最高 1）× 拥挤系数（1 − 在世人数 ÷ {{birth.softCap}}）。生育后要隔 {{birth.cooldown}} 天。所以缺粮时生得少，人口会停在 {{birth.softCap}} 以下（硬上限 {{maxPopulation}}）。
- **孩子**：父母各给孩子最多 {{birth.giftEach}} 元。孩子由父母喂养：存粮补到 {{life.childFoodTarget}} 份（每天最多给 {{life.childFoodPerDay}} 份），多于 {{life.childFoodKeep}} 份会还给家长；父母都不在时，由一位粮多于 {{life.carerMinFood}} 份的成年人接济。为了在模拟里看到新一代，童年被压缩：出生后第 {{life.childhoodDays}} 天正好满 {{work.adultAge}} 岁成年。
- **转行**：每 {{jobSwitch.every}} 天，最穷的 {{jobSwitch.bottomShare|pct}} 的人会改行。先补足保底职业（医生 {{jobSwitch.minWorkers.doctor}} 人、商人 {{jobSwitch.minWorkers.merchant}} 人）；然后，如果至少 {{jobSwitch.shortageShare|pct}} 的天数粮食卖光还有人买不到，就去产粮；物品经常卖光就去做工匠；否则去做最近平均收入最高的职业。改行后技能从 {{jobSwitch.newSkill|pct}} 开始。
- **基尼系数**：0 表示人人一样多，1 表示一个人拥有全部财富。

## 文件说明

- `index.html`：游戏本体（由 `src/` 拼成，可以直接打开）。
- `src/sim.js`：模拟引擎和全部参数 `CONFIG`；`src/ui.js`：界面、图表和规则说明生成；`src/template.html`：页面骨架和样式；`src/README.template.md`：本说明的模板。
- `build.py`：`python3 build.py` 生成 `index.html` 和 `README.md`，并把 README 用到的全部参数写进 `qa/readme-values.txt`。
- `qa/`：自动化测试脚本（Playwright、多种子经济测试）、测试结果和数据样例；`shots/`：测试截图。

## 已知限制

- 这是一个简化的“玩具模型”，参数是为了好看、好理解而设定的，不代表真实社会的规律。
- 每天的事件日志最多记录 {{limits.logPerDay}} 条，普通闲聊不记录；只保留“当天”的日志和每个人最近 {{limits.personalLog}} 条经历。
- 页面上的“状态指纹”覆盖全部状态（每位居民所有字段、全部关系分、价格、救济池、医疗基金、随机数状态等），可以用来核对两次运行是否完全一样。
- 童年被压缩成 {{life.childhoodDays}} 天，是为了让新一代在几年的模拟时间里就能成年，不代表真实。
- 状态不会自动保存，刷新页面会回到第 0 天（但同一个种子会得到同样的结果）。
- 没有在 iPhone 真机 Safari 上测试过，自动测试用的是 Chrome 模拟 iPhone 尺寸。

## 全部参数（CONFIG）

{{CONFIG_TABLE}}

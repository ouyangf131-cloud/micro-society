import json, pathlib, re, subprocess, sys
d = pathlib.Path(__file__).parent
sim = (d / 'src/sim.js').read_text()
t = (d / 'src/template.html').read_text()
t = t.replace('/*__SIM__*/', sim).replace('/*__UI__*/', (d / 'src/ui.js').read_text())
(d / 'index.html').write_text(t)
print('built index.html', len(t))

# README：从 CONFIG 填数字
cfg = json.loads(subprocess.check_output(['node', '-e', sim + '\nprocess.stdout.write(JSON.stringify(CONFIG))']))
def num(x):
    if isinstance(x, float):
        s = ('%.6f' % x).rstrip('0').rstrip('.')
        return s
    return str(x)
derived = {
    'foodSellMax': cfg['market']['foodSellAbove'] * cfg['market']['sellAboveMaxMult'],
    'goodsSellMax': cfg['market']['goodsSellAbove'] * cfg['market']['sellAboveMaxMult'],
    'emergencyMult': 1 + cfg['emergency']['markup'],
    'emergencySellerMin': cfg['emergency']['sellerReserve'] + 1,
    'meetMax': cfg['social']['meetBase'] + cfg['social']['meetExtra'],
}
used = []
def get(path):
    if path in derived: return derived[path]
    v = cfg
    for k in path.split('.'): v = v[k]
    return v
def sub(m):
    path, fmt = m.group(1), m.group(2)
    if path == 'CONFIG_TABLE': return m.group(0)
    v = get(path)
    out = num(round(v * 100, 4)) + '%' if fmt == 'pct' else num(v)
    used.append((path + ('|' + fmt if fmt else ''), out))
    return out
rt = (d / 'src/README.template.md').read_text()
rd = re.sub(r'\{\{([\w.]+)(?:\|(\w+))?\}\}', sub, rt)
rows = []
def walk(prefix, v):
    if isinstance(v, dict):
        for k, x in v.items(): walk(prefix + '.' + k if prefix else k, x)
    else:
        rows.append('| `%s` | %s |' % (prefix, num(v) if not isinstance(v, (str, bool)) else str(v).lower() if isinstance(v, bool) else v))
walk('', cfg)
rd = rd.replace('{{CONFIG_TABLE}}', '| 参数 | 值 |\n|---|---|\n' + '\n'.join(rows))
left = re.findall(r'\{\{[^}]*\}\}', rd)
if left: sys.exit('unresolved placeholders: %s' % left)
(d / 'README.md').write_text(rd)
# 校验：规则段里不允许手写的数字（除了 −100/+100 关系分范围和示例）
rules = rt.split('## 规则（白话版）')[1].split('## 文件说明')[0]
stripped = re.sub(r'\{\{[^}]*\}\}', '', rules)
raw = [x for x in re.findall(r'\d+(?:\.\d+)?', stripped) if x not in ('100', '0', '1')]
(d / 'qa/readme-values.txt').write_text('README 中由 CONFIG 填入的数值（%d 处）：\n' % len(used) + '\n'.join('%s = %s' % u for u in used) +
    '\n\n规则段里手写的数字（应只剩关系分 −100/+100、基尼 0/1、"1 份"等常量）：%s\n' % raw)
print('built README.md, placeholders', len(used), 'raw digits in rules:', raw)

import pathlib
d=pathlib.Path(__file__).parent
t=(d/'src/template.html').read_text()
t=t.replace('/*__SIM__*/',(d/'src/sim.js').read_text()).replace('/*__UI__*/',(d/'src/ui.js').read_text())
(d/'index.html').write_text(t)
print('built', len(t))

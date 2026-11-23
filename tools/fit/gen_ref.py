import json, math, os, re, sys, colorsys
import numpy as np
f = json.load(open(sys.argv[4] if len(sys.argv) > 4 else 'fit4.json'))
BETA, RSPAWN, LIFE = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
def enc(v):
    v = min(1.0, max(0.0, v))
    return v * 12.92 if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055
def dec(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def hexc(rgb): return '#' + ''.join('%02x' % int(round(enc(c) * 255)) for c in rgb)
def hexlin(h): return [dec(int(h[i:i + 2], 16) / 255) for i in (1, 3, 5)]
pal = np.array(f['pal'])
# order the palette by hue so presets can map roles: blue first, then round the wheel
hues = [colorsys.rgb_to_hsv(*[enc(c) for c in p])[0] for p in pal]
order = list(range(5))  # roles: blue, violet, magenta, lavender, warm pink
print('palette order', [(hexc(pal[i]), round(hues[i] * 360)) for i in order])
pal_hex = [hexc(pal[i]) for i in order]
pal_q = np.array([hexlin(h) for h in pal_hex])        # what the runtime will actually use
streaks = f['streaks']
# re-solve weights against the hex-quantised palette so the colours stay exact
from scipy.optimize import nnls
from clusters import clusters
lab, amb, _E = clusters(f, 0.5, 0.25, 0.06, 0.7)
ids = {l: k for k, l in enumerate(sorted(set(int(x) for x in lab if x >= 0)))}
cl = [ids[int(x)] if x >= 0 else -1 for x in lab]
print('ambient', int(amb.sum()), 'clusters', len(ids))
flat = []
for s, c_id in zip(streaks, cl):
    c = np.array(s['w']) @ pal
    w = nnls(pal_q.T, c)[0]
    flat += [round(s['th'], 4), round(s['s'], 5), round(s['ua'], 3), round(s['ha'], 3), round(s['ub'], 3), round(s['hb'], 3)] + [round(float(x), 4) for x in w] + [c_id]
bgB = f['bgB']; bgG = f['bgG']; gk = max(1.0, max(bgG))
REF = dict(colors=pal_hex, background=hexc(bgB), glow=hexc([g / gk for g in bgG]), glowK=round(gk, 4), glowS=round(f['bgS'], 4),
           kap=round(f['kap'], 5), b0=round(f['B0'], 5), beta=BETA, rSpawn=RSPAWN, life=LIFE,
           centerX=round(f['cx'] / f['W'] - 0.5, 5), centerY=round((f['H'] - f['cy']) / f['H'] - 0.5, 5), s=flat)
js = json.dumps(REF, separators=(',', ':'))
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'portal.js')
src = open(p).read()
src = re.sub(r'/\*REF\*/.*?/\*END\*/', lambda m: '/*REF*/' + js + '/*END*/', src, flags=re.S)
open(p, 'w').write(src)
print('streaks', len(streaks), 'bytes', len(js), 'bg', REF['background'], 'glow', REF['glow'], 'gk', gk, 'kap', REF['kap'], 'center', REF['centerX'], REF['centerY'])

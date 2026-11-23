import json, sys, math
from PIL import Image
import numpy as np
f = json.load(open(sys.argv[1])); out = sys.argv[2]
W, H, M, CX, CY, B0 = f['W'], f['H'], f['M'], f['cx'], f['cy'], f['B0']
yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
px = (xx + 0.5 - CX) / M; py = (CY - yy - 0.5) / M
r = np.sqrt(px * px + py * py) + 1e-6; u = np.log(r); ang = np.arctan2(py, px)
def ss(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
bg = np.array(f['bgB'])[None, None] + np.array(f['bgG'])[None, None] * np.exp(-r ** 2 / (2 * f['bgS'] ** 2))[..., None]
pal = np.array(f['pal']); acc = np.zeros((H, W, 3))
for s in f['streaks']:
    s2 = s['s'] ** 2 + (f['kap'] * r) ** 2; se2 = s2 + (B0 / r) ** 2
    d = np.remainder(ang - s['th'] + math.pi, 2 * math.pi) - math.pi
    g = np.exp(-0.5 * d * d / se2) * s['s'] / np.sqrt(se2)
    e = ss(s['ua'] - s['ha'], s['ua'] + s['ha'], u) * (1 - ss(s['ub'] - s['hb'], s['ub'] + s['hb'], u))
    acc += (g * e)[..., None] * (np.array(s['w']) @ pal)[None, None]
o = 1 - np.exp(-(bg + acc))
sr = np.where(o <= 0.0031308, o * 12.92, 1.055 * np.clip(o, 0.0031308, None) ** (1 / 2.4) - 0.055)
img = (np.clip(sr, 0, 1) * 255 + 0.5).astype(np.uint8)
Image.fromarray(img).save(out)
ref = np.asarray(Image.open('ref.png').convert('RGB')).astype(np.float64)
mask = np.ones((H, W), bool); mask[308:398, 12:475] = False; mask[312:390, 1140:1412] = False
print('screen rmse', round(math.sqrt(((img - ref) ** 2)[mask].mean()), 2))
both = Image.new('RGB', (W, H * 2)); both.paste(Image.open('ref.png').convert('RGB'), (0, 0)); both.paste(Image.fromarray(img), (0, H))
both.save(out.replace('.png', '_vs.png'))

# refine: smoothstep envelopes (compact, same as the shader) + a 5-colour palette with per-streak weights
import json, sys, time, math
from PIL import Image
import numpy as np
import torch
dev = torch.device('mps')
f2 = json.load(open('fit2.json'))
CX, CY = f2['cx'], f2['cy']
img = Image.open('ref_clean.png').convert('RGB'); W, H = img.size; M = float(min(W, H))
ref = np.asarray(img).astype(np.float32) / 255
mask = np.ones((H, W), bool); mask[308:398, 12:475] = False; mask[312:390, 1140:1412] = False
NA, NU = 1080, 170
dth = 2 * math.pi / NA
th = (np.arange(NA) + 0.5) * dth - math.pi
u = np.linspace(math.log(5 / M), math.log(800 / M), NU); rn = np.exp(u)
X = CX + np.cos(th)[None] * rn[:, None] * M; Y = CY - np.sin(th)[None] * rn[:, None] * M
valid = (X >= 0) & (X <= W - 1) & (Y >= 0) & (Y <= H - 1)
Xi = np.clip(X, 0, W - 1.001); Yi = np.clip(Y, 0, H - 1.001)
x0 = Xi.astype(int); y0 = Yi.astype(int); fx = (Xi - x0)[..., None]; fy = (Yi - y0)[..., None]
P = ref[y0, x0] * (1 - fx) * (1 - fy) + ref[y0, x0 + 1] * fx * (1 - fy) + ref[y0 + 1, x0] * (1 - fx) * fy + ref[y0 + 1, x0 + 1] * fx * fy
boxw = np.where(mask[np.round(Yi).astype(int), np.round(Xi).astype(int)], 1.0, 0.3)
Wt = np.clip(rn / 0.45, 0.25, 1.0)[:, None] * valid * boxw
T = lambda a: torch.tensor(np.asarray(a), dtype=torch.float32, device=dev)
tP, tW, tu, tr, tth = T(P), T(Wt), T(u), T(rn), T(th)
B0 = f2['B0']
sp = torch.nn.functional.softplus
isp = lambda x: np.log(np.expm1(np.maximum(x, 1e-6)))
spn = lambda x: np.log1p(np.exp(np.asarray(x)))

# prune dead streaks
cc = spn(f2['cc'])
keep = cc.sum(1) > 0.02
print('streaks', len(cc), 'kept', keep.sum())
sel = lambda k: np.asarray(f2[k])[keep]
K = int(keep.sum())

# palette from k-means on chromaticity, weighted by energy
C = cc[keep]; en = C.sum(1)
chrom = C / en[:, None]
rs = np.random.RandomState(0)
best = None
for trial in range(20):
    cen = chrom[rs.choice(K, 5, replace=False, p=en / en.sum())]
    for _ in range(50):
        lab = np.argmin(((chrom[:, None] - cen[None]) ** 2).sum(2), 1)
        cen = np.array([np.average(chrom[lab == j], 0, en[lab == j]) if (lab == j).any() else cen[j] for j in range(5)])
    sse = (en * ((chrom - cen[lab]) ** 2).sum(1)).sum()
    if best is None or sse < best[0]: best = (sse, cen)
pal = best[1] / best[1].max(1, keepdims=True)          # max channel = 1 (linear)
print('palette (linear)', pal.round(3))

par = {
  'th': T(sel('th')), 'ls': T(sel('ls')),
  'ua': T(sel('ua')), 'la': T(np.log(3 * np.exp(sel('lwa')))),
  'ub': T(sel('ub')), 'lb': T(np.log(3 * np.exp(sel('lwb')))),
  'lkap': T(f2['lkap']), 'bgB': T(f2['bgB']), 'bgG': T(f2['bgG']), 'lbs': T(f2['lbs']),
}
# initial palette weights by NNLS
from scipy.optimize import nnls
wts = np.array([nnls(pal.T, c)[0] for c in C])
print('palette fit residual', float(np.abs(wts @ pal - C).sum() / C.sum()))
par['ww'] = T(isp(wts + 1e-4))
par['pal'] = T(np.log(np.clip(pal, 1e-3, None)))
for v in par.values(): v.requires_grad_(True)
lrs = dict(th=0.002, ls=0.02, ua=0.02, la=0.02, ub=0.02, lb=0.02, lkap=0.01, bgB=0.01, bgG=0.01, lbs=0.01, ww=0.02, pal=0.01)
opt = torch.optim.Adam([{'params': [par[k]], 'lr': lrs[k]} for k in par])

def sstep(a, b, x):
    t = torch.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def colors(par):
    pl = torch.exp(par['pal']); pl = pl / pl.max(1, keepdim=True).values
    return sp(par['ww']) @ pl, pl
def render(par, chunk=50):
    kap = torch.exp(par['lkap'])
    bg = sp(par['bgB'])[None] + sp(par['bgG'])[None] * torch.exp(-tr ** 2 / (2 * torch.exp(par['lbs']) ** 2))[:, None]
    col, _ = colors(par)
    acc = torch.zeros(NU, NA, 3, device=dev)
    for a in range(0, K, chunk):
        sl = slice(a, a + chunk)
        s = torch.exp(par['ls'][sl])[:, None]
        s2 = s * s + (kap * tr)[None] ** 2
        se2 = s2 + (B0 / tr)[None] ** 2
        amp = s / torch.sqrt(se2)
        d = torch.remainder(tth[None] - par['th'][sl][:, None] + math.pi, 2 * math.pi) - math.pi
        G = torch.exp(-0.5 * d[:, None, :] ** 2 / se2[:, :, None]) * amp[:, :, None]
        ha = torch.exp(par['la'][sl])[:, None]; hb = torch.exp(par['lb'][sl])[:, None]
        ua = par['ua'][sl][:, None]; ub = par['ub'][sl][:, None]
        E = sstep(ua - ha, ua + ha, tu[None]) * (1 - sstep(ub - hb, ub + hb, tu[None]))
        acc = acc + torch.einsum('knt,kc->ntc', G * E[:, :, None], col[sl])
    lin = bg[:, None, :] + acc
    o = 1 - torch.exp(-lin)
    return torch.where(o <= 0.0031308, o * 12.92, 1.055 * torch.clamp(o, min=0.0031308) ** (1 / 2.4) - 0.055)

steps = int(sys.argv[1]) if len(sys.argv) > 1 else 1200
t0 = time.time()
for it in range(steps):
    opt.zero_grad()
    o = render(par)
    err = ((o - tP) ** 2 * tW[..., None]).sum() / tW.sum() / 3
    reg = 1e-4 * sp(par['ww']).sum() / K
    (err + reg).backward(); opt.step()
    with torch.no_grad():
        par['ls'].clamp_(math.log(0.003), math.log(0.2))
        par['la'].clamp_(math.log(0.08), math.log(1.4)); par['lb'].clamp_(math.log(0.08), math.log(1.6))
        par['ua'].clamp_(math.log(0.006), math.log(1.2)); par['ub'].clamp_(math.log(0.01), math.log(4.0))
        par['lkap'].clamp_(math.log(1e-4), math.log(0.2)); par['pal'].clamp_(max=0.0)
    if it % 100 == 0 or it == steps - 1:
        print(it, round(time.time() - t0, 1), 'rmse', round(math.sqrt(err.item()) * 255, 2), 'kap', round(math.exp(par['lkap'].item()), 4), flush=True)
with torch.no_grad():
    col, pl = colors(par)
    res = dict(cx=CX, cy=CY, W=W, H=H, M=M, B0=B0, kap=math.exp(par['lkap'].item()),
               bgB=sp(par['bgB']).cpu().tolist(), bgG=sp(par['bgG']).cpu().tolist(), bgS=math.exp(par['lbs'].item()),
               pal=pl.cpu().tolist(),
               streaks=[dict(th=par['th'][i].item(), s=math.exp(par['ls'][i].item()), ua=par['ua'][i].item(), ha=math.exp(par['la'][i].item()),
                             ub=par['ub'][i].item(), hb=math.exp(par['lb'][i].item()), w=sp(par['ww'][i]).cpu().tolist()) for i in range(K)])
    json.dump(res, open('fit3.json', 'w'))

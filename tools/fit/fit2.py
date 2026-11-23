import json, sys, time, math
from PIL import Image
import numpy as np
import torch
dev = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
torch.manual_seed(1)
CX, CY = 708.0, 340.0
img = Image.open('ref.png').convert('RGB'); W, H = img.size; M = float(min(W, H))
ref = np.asarray(img).astype(np.float32) / 255
mask = np.ones((H, W), bool); mask[308:398, 12:475] = False; mask[312:390, 1140:1412] = False

NA, NU = int(sys.argv[2]) if len(sys.argv) > 2 else 1080, 170
dth = 2 * math.pi / NA
th = (np.arange(NA) + 0.5) * dth - math.pi
u = np.linspace(math.log(5 / M), math.log(800 / M), NU); rn = np.exp(u)
X = CX + np.cos(th)[None] * rn[:, None] * M; Y = CY - np.sin(th)[None] * rn[:, None] * M
valid = (X >= 0) & (X <= W - 1) & (Y >= 0) & (Y <= H - 1)
Xi = np.clip(X, 0, W - 1.001); Yi = np.clip(Y, 0, H - 1.001)
x0 = Xi.astype(int); y0 = Yi.astype(int); fx = (Xi - x0)[..., None]; fy = (Yi - y0)[..., None]
P = ref[y0, x0] * (1 - fx) * (1 - fy) + ref[y0, x0 + 1] * fx * (1 - fy) + ref[y0 + 1, x0] * (1 - fx) * fy + ref[y0 + 1, x0 + 1] * fx * fy
valid &= mask[np.round(Yi).astype(int), np.round(Xi).astype(int)]
Wt = np.clip(rn / 0.45, 0.25, 1.0)[:, None] * valid

T = lambda a: torch.tensor(np.asarray(a), dtype=torch.float32, device=dev)
tP, tW, tu, tr, tth = T(P), T(Wt), T(u), T(rn), T(th)
B0 = 1.6 / M
K = int(sys.argv[1]) if len(sys.argv) > 1 else 150
isp = lambda x: math.log(math.expm1(x))
par = {
  'th': T(np.linspace(-math.pi, math.pi, K, endpoint=False) + np.random.RandomState(3).uniform(0, 2 * math.pi / K, K)),
  'ls': T(np.full(K, math.log(0.02))),
  'ua': T(np.random.RandomState(4).uniform(math.log(0.04), math.log(0.35), K)),
  'lwa': T(np.full(K, math.log(0.3))),
  'ub': T(np.full(K, math.log(3.0))),
  'lwb': T(np.full(K, math.log(0.3))),
  'cc': T(np.full((K, 3), isp(0.25))),
  'lkap': T([math.log(0.01)]),
  'bgB': T([isp(0.02), isp(0.01), isp(0.12)]),
  'bgG': T([isp(0.17), isp(0.03), isp(0.43)]),
  'lbs': T([math.log(0.22)]),
}
for v in par.values(): v.requires_grad_(True)
lrs = {'th': 0.004, 'ls': 0.03, 'ua': 0.03, 'lwa': 0.03, 'ub': 0.03, 'lwb': 0.03, 'cc': 0.03, 'lkap': 0.02, 'bgB': 0.02, 'bgG': 0.02, 'lbs': 0.02}
opt = torch.optim.Adam([{'params': [par[k]], 'lr': lrs[k]} for k in par])
sp = torch.nn.functional.softplus

def render(par, chunk=50):
    kap = torch.exp(par['lkap'])
    bg = sp(par['bgB'])[None] + sp(par['bgG'])[None] * torch.exp(-tr ** 2 / (2 * torch.exp(par['lbs']) ** 2))[:, None]
    acc = torch.zeros(NU, NA, 3, device=dev)
    for a in range(0, K, chunk):
        sl = slice(a, a + chunk)
        s = torch.exp(par['ls'][sl])[:, None]                                  # (k,1)
        s2 = s * s + (kap * tr)[None] ** 2
        se2 = s2 + (B0 / tr)[None] ** 2                                        # (k,NU)
        amp = s / torch.sqrt(se2)
        d = torch.remainder(tth[None] - par['th'][sl][:, None] + math.pi, 2 * math.pi) - math.pi   # (k,NA)
        G = torch.exp(-0.5 * d[:, None, :] ** 2 / se2[:, :, None]) * amp[:, :, None]                 # (k,NU,NA)
        E = torch.sigmoid((tu[None] - par['ua'][sl][:, None]) / torch.exp(par['lwa'][sl])[:, None]) * \
            torch.sigmoid((par['ub'][sl][:, None] - tu[None]) / torch.exp(par['lwb'][sl])[:, None])  # (k,NU)
        acc = acc + torch.einsum('knt,kc->ntc', G * E[:, :, None], sp(par['cc'][sl]))
    lin = bg[:, None, :] + acc
    out = 1 - torch.exp(-lin)
    srgb = torch.where(out <= 0.0031308, out * 12.92, 1.055 * torch.clamp(out, min=0.0031308) ** (1 / 2.4) - 0.055)
    return srgb

steps = int(sys.argv[3]) if len(sys.argv) > 3 else 1500
t0 = time.time()
for it in range(steps):
    opt.zero_grad()
    out = render(par)
    err = ((out - tP) ** 2 * tW[..., None]).sum() / tW.sum() / 3
    reg = 2e-4 * sp(par['cc']).sum() / K
    (err + reg).backward()
    opt.step()
    with torch.no_grad():
        par['ls'].clamp_(math.log(0.003), math.log(0.2))
        par['lwa'].clamp_(math.log(0.05), math.log(2.0)); par['lwb'].clamp_(math.log(0.05), math.log(2.0))
        par['ua'].clamp_(math.log(0.005), math.log(1.2)); par['ub'].clamp_(math.log(0.01), math.log(4.0))
        par['lkap'].clamp_(math.log(1e-4), math.log(0.2))
    if it % 100 == 0 or it == steps - 1:
        print(it, round(time.time() - t0, 1), 'rmse', round(math.sqrt(err.item()) * 255, 2), 'kap', round(math.exp(par['lkap'].item()), 4), flush=True)

with torch.no_grad():
    out = {k: v.detach().cpu().numpy().tolist() for k, v in par.items()}
    out.update(dict(cx=CX, cy=CY, W=W, H=H, M=M, B0=B0))
    json.dump(out, open('fit2.json', 'w'))
    img_out = (render(par).clamp(0, 1).cpu().numpy() * 255).astype(np.uint8)
    Image.fromarray(img_out[::-1]).resize((1440, 540)).save('fit2_polar.png')

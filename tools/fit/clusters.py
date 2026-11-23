import json, numpy as np, math, sys
def clusters(f, ang_k=0.5, ov=0.35, amb_sig=0.06, amb_rout=0.7):
    st=f['streaks']; pal=np.array(f['pal'])
    th=np.array([x['th'] for x in st]); s=np.array([x['s'] for x in st]); ua=np.array([x['ua'] for x in st]); ub=np.array([x['ub'] for x in st])
    ha=np.array([x['ha'] for x in st])
    E=np.array([(np.array(x['w'])@pal).sum()*x['s'] for x in st])
    amb=(s>=amb_sig)&(np.exp(ub)<amb_rout)
    n=len(st); par=list(range(n))
    def find(a):
        while par[a]!=a: par[a]=par[par[a]]; a=par[a]
        return a
    lo=ua-ha; hi=np.maximum(ub, ua+0.1)
    for i in range(n):
        for j in range(i+1,n):
            if amb[i] or amb[j]: continue
            d=abs((th[i]-th[j]+math.pi)%(2*math.pi)-math.pi)
            if d> ang_k*(s[i]+s[j])+0.004: continue
            inter=min(hi[i],hi[j])-max(lo[i],lo[j]); short=min(hi[i]-lo[i],hi[j]-lo[j])
            if inter>ov*short: par[find(i)]=find(j)
    lab=np.array([find(i) for i in range(n)]); lab[amb]=-1
    return lab, amb, E
if __name__=='__main__':
    f=json.load(open('fit4.json'))
    for ak in [0.35,0.5,0.7]:
        for ov in [0.25,0.5]:
            lab,amb,E=clusters(f,ak,ov)
            u=[l for l in set(lab) if l>=0]; sizes=sorted([(lab==l).sum() for l in u],reverse=True)
            print(f'ang_k {ak} ov {ov}: ambient {amb.sum()} (E {E[amb].sum()/E.sum():.2f}) clusters {len(u)} biggest {sizes[:8]}')

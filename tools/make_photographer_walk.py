import sys
from PIL import Image
import numpy as np
U='/mnt/user-data/uploads/'
strips={'S':U+'3e9810dc-image.jpg','SE':U+'536d2137-image.jpg','E':U+'6990a629-image.jpg','NE':U+'6bc10b3a-image.jpg','N':U+'63091515-image.jpg'}
src=Image.open(U+'5de6b32b-image.png').convert('RGBA')
order={'N':4,'NE':3,'E':2,'SE':1,'S':0,'SW':7,'W':6,'NW':5}
mirror={'W':'E','SW':'SE','NW':'NE'}

def idle(d):
    k=order[d]; cell=src.crop(((k%3)*256,(k//3)*256,(k%3)*256+256,(k//3)*256+256))
    return cell.crop(cell.getbbox())

def key(path):
    a=np.array(Image.open(path).convert('RGB')).astype(int)
    r,g,b=a[...,0],a[...,1],a[...,2]
    bg=(g>100)&(g>r*1.25)&(g>b*1.25)
    alpha=np.where(bg,0,255).astype(np.uint8)
    # despill
    cap=np.maximum(r,b)+10
    g2=np.where(g>cap,cap,g)
    out=np.dstack([r,g2,b,alpha]).astype(np.uint8)
    return out

def frames_of(rgba):
    al=rgba[...,3]>0
    col=al.sum(0)>4
    segs=[];s=None
    for x,v in enumerate(list(col)+[False]):
        if v and s is None:s=x
        if not v and s is not None:
            if x-s>80:segs.append((s,x))
            s=None
    out=[]
    for x0,x1 in segs:
        sub=rgba[:,x0:x1]
        rows=np.where((sub[...,3]>0).sum(1)>3)[0]
        out.append(Image.fromarray(sub[rows[0]:rows[-1]+1]))
    return out

def head_cx(img):
    a=np.array(img)[...,3]>128; h=a.shape[0]
    ys,xs=np.where(a[:int(h*0.12)])
    return xs.mean()

walk={}
for d,p in strips.items():
    fr=frames_of(key(p))
    assert len(fr)==4,(d,len(fr))
    th=idle(d).height
    k=th/max(f.height for f in fr)
    res=[]
    for f in fr:
        f=f.resize((max(1,round(f.width*k)),max(1,round(f.height*k))),Image.LANCZOS)
        a=np.array(f); a[...,3]=np.where(a[...,3]>110,255,0); res.append(Image.fromarray(a))
    walk[d]=res
for d,m in mirror.items():
    walk[d]=[f.transpose(Image.FLIP_LEFT_RIGHT) for f in walk[m]]

C=352
rows=['N','NE','E','SE','S','SW','W','NW']
# cols: idle, walk_1, walk_2, shoot(idle), walk_3, walk_4
sheet=Image.new('RGBA',(C*6,C*8),(0,0,0,0))
for r,d in enumerate(rows):
    i=idle(d); w=walk[d]
    for c,img in enumerate([i,w[0],w[1],i,w[2],w[3]]):
        hx=head_cx(img)
        x=c*C+round(C/2-hx); y=r*C+C-30-img.height
        sheet.paste(img,(x,y),img)
sheet.save(sys.argv[1])
prev=Image.new('RGBA',(6*176,8*176),(60,60,80,255))
for r in range(8):
    for c in range(6):
        cell=sheet.crop((c*C,r*C,c*C+C,r*C+C)).resize((176,176),Image.LANCZOS)
        prev.paste(cell,(c*176,r*176),cell)
prev.save(sys.argv[2])

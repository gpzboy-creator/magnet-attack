import sys, json
from PIL import Image
import numpy as np
U='/mnt/user-data/uploads/'
sheets={'S':('e214b2e4',4),'SE':('9e51223e',4),'E':('fbc0c395',4),'NE':('14c97ece',4),
        'NW':('9ab21524',5),'W':('5042bfc0',5),'SW':('f01b7a81',5)}
rows=['N','NE','E','SE','S','SW','W','NW']
C=352
def cell(im,k): return im.crop(((k%3)*256,(k//3)*256,(k%3)*256+256,(k//3)*256+256))
def head_cx(img):
    a=np.array(img)[...,3]>128; h=a.shape[0]; ys,xs=np.where(a[:int(h*0.12)]); return xs.mean()
out=Image.new('RGBA',(C*9,C*8),(0,0,0,0))
meta={}
for r,d in enumerate(rows):
    if d not in sheets: continue
    f,flash=sheets[d]
    im=Image.open(U+f+'-image.png').convert('RGBA')
    c0=cell(im,0); bb=c0.getbbox(); hx=bb[0]+head_cx(c0.crop(bb))
    ox=round(C/2-hx); oy=C-30-bb[3]
    for k in range(9):
        c=cell(im,k); out.paste(c,(k*C+ox,r*C+oy),c)
    meta[d]={'flash':flash}
out.save(sys.argv[1]); print(json.dumps(meta))

import sys
from PIL import Image
import numpy as np
src=Image.open(sys.argv[1]).convert('RGBA')
order={'N':4,'NE':3,'E':2,'SE':1,'S':0,'SW':7,'W':6,'NW':5}

def sprite(k):
    cell=src.crop(((k%3)*256,(k//3)*256,(k%3)*256+256,(k//3)*256+256))
    return cell.crop(cell.getbbox())

def walk_frames(spr):
    a=np.array(spr); h,w=a.shape[:2]; al=a[:,:,3]>16
    waist=int(h*0.58)
    legs=a[waist:].copy(); body=a.copy(); body[waist:]=0
    lal=legs[:,:,3]>16
    xs=np.where(lal.any(0))[0]
    # split the two legs at the emptiest column in the middle third of the leg span
    lo,hi=xs[0]+(xs[-1]-xs[0])//3, xs[0]+2*(xs[-1]-xs[0])//3
    counts=lal[int(lal.shape[0]*0.35):].sum(0)
    mid=lo+int(np.argmin(counts[lo:hi+1]))
    out=[]
    LIFT=8
    for lift_left in (True,False):
        f=np.zeros((h,w,4),np.uint8)
        L=legs.copy(); R=legs.copy(); L[:,mid:]=0; R[:,:mid]=0
        up,down=(L,R) if lift_left else (R,L)
        lh=legs.shape[0]
        # planted leg stays in place
        seg=f[waist:waist+lh]
        f[waist:waist+lh]=np.where(down[:,:,3:4]>16,down,seg)
        # lifted leg rises (its top slides under the body)
        seg=f[waist-LIFT:waist-LIFT+lh]
        f[waist-LIFT:waist-LIFT+lh]=np.where(up[:,:,3:4]>16,up,seg)
        # body on top, unchanged (the game adds the walk bob)
        f[:]=np.where(body[:,:,3:4]>16,body,f)
        out.append(Image.fromarray(f))
    return out

C=352
rows=['N','NE','E','SE','S','SW','W','NW']
sheet=Image.new('RGBA',(C*4,C*8),(0,0,0,0))
for r,d in enumerate(rows):
    spr=sprite(order[d]); A,B=walk_frames(spr)
    for c,img in enumerate([spr,A,B,spr]):
        bb=img.getbbox(); img=img.crop(bb)
        x=c*C+(C-img.width)//2; y=r*C+C-30-img.height
        sheet.paste(img,(x,y),img)
sheet.save(sys.argv[2])
# preview: rows S,E,N,SE with idle,A,B
prev=Image.new('RGBA',(3*200,4*260),(60,60,80,255))
for i,d in enumerate(['S','SE','E','N']):
    r=rows.index(d)
    for c in range(3):
        cell=sheet.crop((c*C,r*C,c*C+C,r*C+C)).resize((200,200),Image.LANCZOS)
        prev.paste(cell,(c*200,i*260),cell)
prev.resize((900,1560),Image.NEAREST).save(sys.argv[3])

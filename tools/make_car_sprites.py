import sys
from PIL import Image
import numpy as np
from collections import deque
def key(path, box):
    im=Image.open(path).convert('RGB').crop(box); a=np.array(im).astype(int)
    h,w,_=a.shape
    mx=a.max(2); mn=a.min(2)
    light=(mn>165)&(mx-mn<22)          # checkerboard squares
    shadowish=(mx-mn<14)&(mn>95)        # neutral gray (shadow over checker)
    bg=np.zeros((h,w),bool); q=deque()
    for x in range(w):
        for y in (0,h-1): q.append((y,x))
    for y in range(h):
        for x in (0,w-1): q.append((y,x))
    while q:
        y,x=q.popleft()
        if y<0 or x<0 or y>=h or x>=w or bg[y,x]: continue
        if not (light[y,x] or shadowish[y,x]): continue
        bg[y,x]=True
        q.extend([(y+1,x),(y-1,x),(y,x+1),(y,x-1)])
    fg=~bg
    # keep only the biggest connected blob (drops leftover shadow specks)
    lab=np.zeros((h,w),int); cur=0; sizes={}
    for sy in range(h):
        for sx in range(w):
            if fg[sy,sx] and not lab[sy,sx]:
                cur+=1; n=0; q=deque([(sy,sx)]); lab[sy,sx]=cur
                while q:
                    y,x=q.popleft(); n+=1
                    for yy,xx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
                        if 0<=yy<h and 0<=xx<w and fg[yy,xx] and not lab[yy,xx]:
                            lab[yy,xx]=cur; q.append((yy,xx))
                sizes[cur]=n
    big=max(sizes,key=sizes.get)
    alpha=np.where(lab==big,255,0).astype(np.uint8)
    out=Image.fromarray(np.dstack([a.astype(np.uint8),alpha]))
    return out.crop(out.getbbox())
U='/mnt/user-data/uploads/'
closed=key(U+'dc76c7d8-image.png',(0,0,344,236))
opened=key(U+'f8447276-image.png',(688,0,1032,283))
closed.save('car-closed.png'); opened.save('car-open.png')
print(closed.size, opened.size)
bg=Image.new('RGBA',(1200,420),(40,44,56,255))
bg.paste(closed.resize((closed.width*2,closed.height*2),Image.NEAREST),(0,0),closed.resize((closed.width*2,closed.height*2),Image.NEAREST))
bg.paste(opened.resize((opened.width*2,opened.height*2),Image.NEAREST),(600,0),opened.resize((opened.width*2,opened.height*2),Image.NEAREST))
bg.save('prev.png')

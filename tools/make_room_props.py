"""Clean PixelLab room-furniture renders and measure their isometric footprint.
usage: python3 make_room_props.py <src_dir> <out_dir>
Keeps the big connected parts (drops stray speckles), crops to content, writes room-<name>.png
(+ a mirrored stall), and prints ax, ay, lx, ly for venueRooms.ts:
  bottom corner = lowest opaque pixel; left corner = leftmost column of the lower half;
  lx = bottom.x - left.x, ly = right.x - bottom.x, ay = bottom.y - lx/2.
"""
import sys
from collections import deque
from PIL import Image, ImageOps

NAMES = ['vanity', 'sofa', 'flowers', 'sinks', 'stall']

def keep_big_parts(im, min_px=40):
    px = im.load(); w, h = im.size
    seen = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if seen[y][x] or px[x, y][3] < 40:
                continue
            comp = []; q = deque([(x, y)]); seen[y][x] = True
            while q:
                cx, cy = q.popleft(); comp.append((cx, cy))
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = cx+dx, cy+dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny][3] >= 40:
                        seen[ny][nx] = True; q.append((nx, ny))
            if len(comp) < min_px:
                for cx, cy in comp:
                    px[cx, cy] = (0, 0, 0, 0)
    # faint alpha leftovers
    for y in range(h):
        for x in range(w):
            if px[x, y][3] < 40:
                px[x, y] = (0, 0, 0, 0)
    return im

def measure(im):
    px = im.load(); w, h = im.size
    by = max(y for y in range(h) for x in range(w) if px[x, y][3] > 0)
    xs = [x for x in range(w) if px[x, by][3] > 0]
    bx = sum(xs) / len(xs)
    lower = [(x, y) for y in range(h // 2, h) for x in range(w) if px[x, y][3] > 0]
    lx_ = min(x for x, _ in lower); rx_ = max(x for x, _ in lower)
    lx = bx - lx_; ly = rx_ - bx
    return dict(ax=round(lx_), ay=round(by - lx / 2), lx=round(lx), ly=round(ly), w=w, h=h)

src, out = sys.argv[1], sys.argv[2]
for n in NAMES:
    im = keep_big_parts(Image.open(f'{src}/{n}_0.png').convert('RGBA'))
    im = im.crop(im.getbbox())
    # the sinks stand against the north wall (long side along x): mirrored copy
    variants = [(n, im)] + ([(n + '-mirror', ImageOps.mirror(im))] if n == 'sinks' else [])
    for name, v in variants:
        v.save(f'{out}/room-{name}.png')
        print(name, measure(v))

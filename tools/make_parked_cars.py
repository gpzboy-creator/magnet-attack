"""Crop PixelLab parked-car renders to their content and fix stray light 'shadow' blobs.
usage: python3 make_parked_cars.py <src_dir> <out_dir>
"""
import sys
from collections import deque
from PIL import Image

NAMES = ['white_0:white', 'black_suv:black-suv', 'red_hatch:red-hatch', 'silver_van:silver-van',
         'blue_hybrid:blue-hybrid', 'yellow_taxi:yellow-taxi', 'beige_sedan:beige-sedan']

def fix_light_blob(im, min_y):
    """Turn near-white pixels reachable from transparency (below min_y) into a soft dark shadow."""
    px = im.load(); w, h = im.size
    light = lambda p: p[3] > 20 and min(p[:3]) > 215
    seen = set(); q = deque()
    for y in range(min_y, h):
        for x in range(w):
            if px[x, y][3] <= 20:
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and min_y <= ny < h and (nx, ny) not in seen and light(px[nx, ny]):
                        seen.add((nx, ny)); q.append((nx, ny))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < w and min_y <= ny < h and (nx, ny) not in seen and light(px[nx, ny]):
                seen.add((nx, ny)); q.append((nx, ny))
    for x, y in seen:
        px[x, y] = (8, 9, 14, 90)
    return len(seen)

src, out = sys.argv[1], sys.argv[2]
for pair in NAMES:
    s, d = pair.split(':')
    im = Image.open(f'{src}/{s}.png').convert('RGBA')
    if s == 'yellow_taxi':
        print('taxi shadow px', fix_light_blob(im, 170))
    im = im.crop(im.getbbox())
    im.save(f'{out}/parked-{d}.png')
    print(d, im.size)

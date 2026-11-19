"""Clean the PixelLab hall bar render (seed 7) and measure its footprint.
usage: python3 tools/make_hall_bar.py <bar_s7_0.png> <out.png>
Drops stray speckles (keep_big_parts from make_room_props.py) and crops. Not mirrored: PixelLab drew
the long side along world y with the X-panel front facing +x, which is how the bar stands on the
dance floor's left side. Prints the floor corners (left, bottom, right) for HALL_BAR_SPRITE in
src/render/hallBar.ts: ax, ay = left corner, lx = bottom.x - left.x, ly = right.x - bottom.x.
"""
import sys
import os
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from make_room_props import keep_big_parts  # noqa: E402

src, out = sys.argv[1], sys.argv[2]
im = keep_big_parts(Image.open(src).convert('RGBA'))
im = im.crop(im.getbbox())
im.save(out)
px = im.load(); w, h = im.size
op = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 0]
B = max(op, key=lambda p: (p[1], p[0]))                                      # bottom corner
L = min([p for p in op if p[1] > h * 0.8], key=lambda p: (p[0], -p[1]))     # left corner
R = max([p for p in op if p[1] > h * 0.3], key=lambda p: (p[0], p[1]))      # right corner
print('size', w, h, 'L', L, 'B', B, 'R', R, 'lx', B[0] - L[0], 'ly', R[0] - B[0])

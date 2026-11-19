"""Clean the PixelLab folding-table render for the magnet workstation.
usage: python3 make_station_table.py <table_0.png> <out.png>
Drops stray speckles (same cleanup as make_room_props.py), mirrors it so the long side runs along
world x (PixelLab drew it along y), crops, and prints the top-surface corners used for the
footprint in src/render/workstationDesk.ts (left corner L, back corner T, right corner R).
"""
import sys
import os
from PIL import Image, ImageOps

sys.path.insert(0, os.path.dirname(__file__))
from make_room_props import keep_big_parts  # noqa: E402

src, out = sys.argv[1], sys.argv[2]

im = keep_big_parts(Image.open(src).convert('RGBA'))
im = ImageOps.mirror(im)
im = im.crop(im.getbbox())
im.save(out)
px = im.load(); w, h = im.size
light = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 200 and sum(px[x, y][:3]) / 3 > 200]
L = min(light, key=lambda p: (p[0], p[1]))
T = min(light, key=lambda p: (p[1], p[0]))
R = max(light, key=lambda p: (p[0], -p[1]))
lowest = max(y for y in range(h) for x in range(w) if px[x, y][3] > 0)
print('size', w, h, 'L', L, 'T', T, 'R', R, 'lowest pixel', lowest)

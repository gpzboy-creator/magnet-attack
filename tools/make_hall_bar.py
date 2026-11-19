"""Clean the PixelLab hall bar render (seed 7) and measure its footprint.
usage: python3 tools/make_hall_bar.py <bar_s7_0.png> <out.png>
Drops stray speckles (keep_big_parts from make_room_props.py), mirrors it so the long side runs
along world x (PixelLab drew it along y) with the X-panel front facing +y (the tables), crops,
and prints ax, ay, lx, ly, h for HALL_BAR_SPRITE in src/render/hallBar.ts.
"""
import sys
import os
from PIL import Image, ImageOps

sys.path.insert(0, os.path.dirname(__file__))
from make_room_props import keep_big_parts, measure  # noqa: E402

src, out = sys.argv[1], sys.argv[2]
im = keep_big_parts(Image.open(src).convert('RGBA'))
im = ImageOps.mirror(im)
im = im.crop(im.getbbox())
im.save(out)
m = measure(im)
px = im.load()
# top of the counter = first marble-white row at the left corner column region
print(m)

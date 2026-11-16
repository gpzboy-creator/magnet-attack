"""Pack 8 PixelLab rotation PNGs (dj_south.png ...) into one horizontal sheet.
Order: S, SE, E, NE, N, NW, W, SW.  usage: make_rotation_sheet.py <src_dir> <prefix> <out.png>
"""
import sys
from PIL import Image
ORDER = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
src, prefix, out = sys.argv[1:4]
ims = [Image.open(f'{src}/{prefix}_{d}.png').convert('RGBA') for d in ORDER]
c = ims[0].width
sheet = Image.new('RGBA', (c * 8, c), (0, 0, 0, 0))
for i, im in enumerate(ims):
    sheet.alpha_composite(im, (i * c, 0))
sheet.save(out)
print(out, sheet.size)

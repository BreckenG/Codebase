import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', '..', '..', 'web', 'app', 'public', 'fonts')
OUT = os.path.join(HERE, '..', 'Resources')
FACES = [('title', 'bricolage-latin.woff2', 800, 46), ('body', 'onest-latin.woff2', 600, 26)]
W, H, PAD = 1024, 256, 2
os.makedirs(OUT, exist_ok=True)
atlas = Image.new('L', (W, H), 0)
draw = ImageDraw.Draw(atlas)
lines = []
x = y = PAD
row = 0
for name, file, weight, size in FACES:
    font = ImageFont.truetype(os.path.join(FONTS, file), size)
    font.set_variation_by_axes([weight])
    ascent, descent = font.getmetrics()
    lines.append('face %s %d %d %d' % (name, size, ascent, ascent + descent))
    for code in range(32, 127):
        ch = chr(code)
        box = font.getbbox(ch)
        gw, gh = max(0, box[2] - box[0]), max(0, box[3] - box[1])
        if x + gw + PAD > W:
            x, y, row = PAD, y + row + PAD, 0
        if gw and gh:
            draw.text((x - box[0], y - box[1]), ch, font=font, fill=255)
        lines.append('%d %d %d %d %d %d %d %d' % (code, x, y, gw, gh, box[0], box[1], round(font.getlength(ch))))
        x += gw + PAD
        row = max(row, gh)
    x, y, row = PAD, y + row + PAD, 0
assert y < H, y
open(os.path.join(OUT, 'font.bin'), 'wb').write(bytes([W & 255, W >> 8, H & 255, H >> 8]) + atlas.tobytes())
open(os.path.join(OUT, 'font.txt'), 'w', newline='\n').write('\n'.join(lines) + '\n')
print('atlas', W, H, 'used rows to', y)

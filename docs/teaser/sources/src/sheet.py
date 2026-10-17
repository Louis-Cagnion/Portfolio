# Planche-contact horodatée : python3 -I sheet.py <dossier d'images> <fps> <t0> <colonnes> <sortie.jpg> [indices...]
import sys, os
from PIL import Image, ImageDraw
d, fps, t0, cols, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
files = sorted(f for f in os.listdir(d) if f.endswith('.jpg'))
sel = [int(x) for x in sys.argv[6:]] or range(len(files))
ims = [(i, Image.open(os.path.join(d, files[i]))) for i in sel]
w, h = ims[0][1].size
tw = 640; th = int(h * tw / w)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * th), (0, 0, 0))
for n, (i, im) in enumerate(ims):
    im = im.resize((tw, th))
    dr = ImageDraw.Draw(im); dr.rectangle((0, 0, 70, 20), fill=(0, 0, 0)); dr.text((4, 4), f"{t0 + i / fps:5.2f}s", fill=(255, 255, 0))
    sheet.paste(im, ((n % cols) * tw, (n // cols) * th))
sheet.save(out, quality=88)
print(sheet.size)

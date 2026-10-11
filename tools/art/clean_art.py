# Cut a character out of its plain light background (flood fill from the edges), crop, and save a 640 px webp.
# Usage: python tools/art/clean_art.py <folder of .png> <output folder>
# Preserved from the v36 session. Change: a file name without a 'NN-' prefix now keeps its whole name (it used to crash).
import sys, os, glob, cv2, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, '*.png'))):
    im = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2RGB)
    H, W = im.shape[:2]
    # background colour = median of the border
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
    bg = np.median(border, axis=0)
    d = np.sqrt(((im.astype(float) - bg) ** 2).sum(2))
    near = (d < 26).astype(np.uint8)
    fill = near.copy(); mask = np.zeros((H + 2, W + 2), np.uint8)
    for s in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 0), (W // 2, H - 1), (0, H // 2), (W - 1, H // 2)]:
        if fill[s[1], s[0]] == 1: cv2.floodFill(fill, mask, s, 2)
    bgm = fill == 2
    alpha = np.where(bgm, 0, 255).astype(np.float32)
    # soft edge + keep faint glows (lamp, steam) as translucent instead of a box
    soft = bgm | (cv2.dilate(bgm.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
    alpha[soft & ~bgm] = np.clip((d[soft & ~bgm] - 8) / 45 * 255, 0, 255)
    glow = bgm & (d > 8)
    alpha[glow] = np.clip((d[glow] - 8) / 40 * 200, 0, 200)
    rgba = np.dstack([im, alpha.astype(np.uint8)])
    ys, xs = np.where(rgba[:, :, 3] > 24)
    x0, x1, y0, y1 = max(0, xs.min() - 6), min(W, xs.max() + 7), max(0, ys.min() - 6), min(H, ys.max() + 7)
    out = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
    out.thumbnail((640, 640), Image.LANCZOS)
    base = os.path.splitext(os.path.basename(f))[0]
    name = base.split('-', 1)[1] if '-' in base else base  # '03-sitting.png' -> 'sitting'
    out.save(os.path.join(dst, name + '.webp'), 'WEBP', quality=86, method=6)
    print(name, out.size, os.path.getsize(os.path.join(dst, name + '.webp')) // 1024, 'KB')

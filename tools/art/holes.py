# Show light areas trapped inside a cut-out (painted magenta) so you can see what defringe would punch out.
# Usage: python tools/art/holes.py art/sitting.webp [out.png]
# Preserved from the v36 session. Change: takes an image path and output path instead of fixed app/art and shots folders.
import sys, os, cv2, numpy as np
from PIL import Image
src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else 'holes-' + os.path.splitext(os.path.basename(src))[0] + '.png'
im = np.array(Image.open(src).convert('RGBA')).astype(int)
C, A = im[..., :3], im[..., 3]
lum = C.mean(2); sd = C.std(2)
cand = ((A > 200) & (lum > 225) & (sd < 12)).astype(np.uint8)
k, lab, stats, cent = cv2.connectedComponentsWithStats(cand, 8)
vis = im.copy(); vis[..., :3] = (vis[..., :3] * 0.5).astype(int); vis[..., 3] = 255
for i in range(1, k):
    a = stats[i, 4]
    if a < 40: continue
    x, y, w, h = stats[i, :4]
    m = lab == i
    vis[m] = [255, 0, 255, 255]
    print(i, 'area', a, 'box', x, y, w, h, 'mean', C[m].mean(0).round())
Image.fromarray(vis.astype(np.uint8)).save(out); print('saved', out)

# Usage: python tools/art/defringe.py <folder of .webp> <output folder>
# Preserved unchanged from the v36 session's defringe3.py (defringe2.py was the same minus the AUTO step, so it isn't kept).
# AUTO and HOLES name specific pictures and pixel spots in the ORIGINAL cut-outs; update them for new art.
# Clean cut-outs: punch out trapped background gaps, then un-mix the edge pixels from the old background.
import sys, glob, os, cv2, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
AUTO = {'grab', 'manual', 'carve'}
HOLES = {'sitting': [(125, 410)], 'afternoon': [(129, 413)], 'eating': [(314, 341)]}
for f in sorted(glob.glob(src + '/*.webp')):
    n = os.path.splitext(os.path.basename(f))[0]
    im = np.array(Image.open(f).convert('RGBA')).astype(np.float32)
    C, A = im[..., :3], im[..., 3]
    lum = C.mean(2); sd = C.std(2)
    if n in AUTO:
        cand = ((A > 200) & (lum > 225) & (sd < 12)).astype(np.uint8)
        k, lab, st, _ = cv2.connectedComponentsWithStats(cand, 8)
        for j in range(1, k):
            m = lab == j
            if st[j, 4] > 1500 and C[m].mean() > 251.5:
                m = cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
                m &= (lum > 200)
                A[m] = 0; print(n, 'auto hole', int(m.sum()))
    for (x, y) in HOLES.get(n, []):
        cand = ((lum > 215) & (sd < 16)).astype(np.uint8)
        k, lab = cv2.connectedComponents(cand, connectivity=8)
        assert cand[y, x], (n, x, y, C[y, x])
        m = lab == lab[y, x]
        print(n, 'hole', int(m.sum()))
        A[m] = 0
    clear = (A < 8).astype(np.uint8)
    dist = cv2.distanceTransform(1 - clear, cv2.DIST_L2, 3)
    band = (clear == 0) & (dist <= 3.5)
    light = band & (lum > 228) & (sd < 14)
    bg = np.median(C[light], axis=0) if light.sum() > 50 else np.array([253, 251, 232.])
    bgl = bg.mean()
    # how much "ink" is in the pixel: by darkness, or by colour that the background doesn't have
    a_dark = np.clip((bgl - lum) / (bgl - 35), 0, 1)
    diff = C - bg; chroma = np.sqrt(((diff - diff.mean(2, keepdims=True)) ** 2).sum(2))
    a_col = np.clip(chroma / 90, 0, 1)
    an = np.maximum(a_dark, a_col)
    tgt = band & (lum > 40)
    newA = A.copy(); newA[tgt] = np.minimum(A[tgt], an[tgt] * 255)
    k = np.maximum(an, 0.08)[..., None]
    dec = np.clip(bg + (C - bg) / k, 0, 255)
    C2 = C.copy(); C2[tgt] = dec[tgt]
    newA[newA < 10] = 0
    out = np.dstack([C2, newA]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(os.path.join(dst, n + '.webp'), 'WEBP', quality=88, method=6)

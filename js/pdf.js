// Tiny offline PDF maker. Each A4 page is drawn on a canvas with the app's own fonts, then the pages are
// packed into a real PDF (one picture per page). No libraries, nothing leaves the phone.
export const PW = 1240, PH = 1754, M = 96;            // A4 at 150 dpi, page margin
export const INK = '#23262F', SOFT = '#6B6456', LINE = '#E6DCC4', PAPER = '#FBF6E9', CARD = '#FFFDF7', BLUE = '#1F55D0', SUN = '#F4C430';
export const HAND = '"Gaegu", cursive', BODY = '"Nunito", system-ui, sans-serif';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toDate = k => { if (k instanceof Date) return k; const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
// "October 10", "Monday, October 10", "Mon, Oct 10", "October 10, 2026"
export const longDate = (k, year) => { const d = toDate(k); return MONTHS[d.getMonth()] + ' ' + d.getDate() + (year ? ', ' + d.getFullYear() : ''); };
export const dayDate = k => { const d = toDate(k); return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate(); };
export const shortDay = k => { const d = toDate(k); return DAYS[d.getDay()].slice(0, 3) + ', ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getDate(); };
export const range = (a, b) => { const A = toDate(a), B = toDate(b); return A.getFullYear() === B.getFullYear() ? longDate(a) + ' – ' + longDate(b, true) : longDate(a, true) + ' – ' + longDate(b, true); };
export const clock = ts => { const d = new Date(ts); let h = d.getHours(); const m = d.getMinutes(), ap = h < 12 ? 'am' : 'pm'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + ap; };
export const dur = mins => { mins = Math.round(mins); const h = Math.floor(mins / 60), m = mins % 60; return h ? h + ' h' + (m ? ' ' + m + ' m' : '') : m + ' m'; };

export function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function txt(g, s, x, y, font, colour, align, maxW) {
  g.font = font; g.fillStyle = colour || INK; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic';
  if (maxW && g.measureText(s).width > maxW) { // shrink a little, then trim with an ellipsis
    let size = parseInt(font.match(/(\d+)px/)[1], 10), min = Math.round(size * 0.8);
    while (g.measureText(s).width > maxW && size > min) { size -= 1; g.font = font.replace(/\d+px/, size + 'px'); }
    if (g.measureText(s).width > maxW) { while (s.length > 1 && g.measureText(s + '…').width > maxW) s = s.slice(0, -1); s += '…'; }
  }
  g.fillText(s, x, y);
}
// wrap text into lines that fit a width
export function wrap(g, s, font, maxW) {
  g.font = font; const out = []; let line = '';
  s.split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
  if (line) out.push(line); return out;
}

// a document: pages with a flowing cursor, so long lists spill onto new pages
export class Doc {
  constructor(title, sub) { this.title = title; this.sub = sub; this.pages = []; this.newPage(); }
  newPage() {
    const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    const g = c.getContext('2d'); g.fillStyle = PAPER; g.fillRect(0, 0, PW, PH);
    // a faint dot grid, like a journal page
    g.fillStyle = 'rgba(31,85,208,.07)'; for (let y = 40; y < PH; y += 36) for (let x = 40; x < PW; x += 36) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
    this.pages.push(c); this.g = g; this.y = M;
    if (this.pages.length > 1) { // a small running header on later pages
      txt(g, this.title, M, M + 10, '700 40px ' + HAND, INK);
      txt(g, this.sub, PW - M, M + 8, '800 20px ' + BODY, SOFT, 'right');
      g.fillStyle = LINE; g.fillRect(M, M + 30, PW - 2 * M, 2); this.y = M + 70;
    }
    return g;
  }
  need(h) { if (this.y + h > PH - M - 40) this.newPage(); return this.g; }
  space(h) { this.y += h; }
  heading(s, note, follow) {
    const g = this.need(90 + (follow || 120)); this.y += 18;
    txt(g, s, M, this.y + 44, '700 52px ' + HAND, INK);
    if (note) txt(g, note, PW - M, this.y + 40, '700 20px ' + BODY, SOFT, 'right', 520);
    this.y += 66;
  }
  para(s, font, colour, w) {
    font = font || '600 24px ' + BODY; const lines = wrap(this.g, s, font, w || PW - 2 * M), lh = parseInt(font.match(/(\d+)px/)[1], 10) * 1.45;
    lines.forEach(l => { const g = this.need(lh); txt(g, l, M, this.y + lh * 0.75, font, colour || INK); this.y += lh; });
  }
  // a table that repeats its header row when it runs onto a new page
  table(cols, rows, opts = {}) {
    const rh = opts.rh || 46, x0 = M, w = PW - 2 * M;
    const head = () => {
      const g = this.need(rh * 2); g.fillStyle = INK; rr(g, x0, this.y, w, rh, 12); g.fill();
      let x = x0 + 18; cols.forEach(c => { txt(g, c.label, c.right ? x + c.w - 24 : x, this.y + rh * 0.66, '800 19px ' + BODY, '#FFFFFF', c.right ? 'right' : 'left'); x += c.w; });
      this.y += rh;
    };
    head();
    rows.forEach((r, i) => {
      if (r.group) { // a day heading inside the table
        if (this.y + rh * 2.2 > PH - M - 40) { this.newPage(); head(); }
        const g = this.g; txt(g, r.group, x0 + 4, this.y + rh * 0.95, '800 22px ' + BODY, BLUE); if (r.note) txt(g, r.note, x0 + w - 4, this.y + rh * 0.95, '700 19px ' + BODY, SOFT, 'right');
        this.y += rh * 1.15; return;
      }
      if (this.y + rh > PH - M - 40) { this.newPage(); head(); }
      const g = this.g;
      if (opts.byShade ? r.shade : i % 2 === 0) { g.fillStyle = CARD; g.fillRect(x0, this.y, w, rh); }
      g.fillStyle = LINE; g.fillRect(x0, this.y + rh - 1, w, 1);
      let x = x0 + 18;
      cols.forEach((c, j) => { const v = r.cells[j]; if (v != null && v !== '') txt(g, String(v), c.right ? x + c.w - 24 : x, this.y + rh * 0.66, (j === 0 && opts.boldFirst ? '800 ' : '600 ') + (opts.fs || 21) + 'px ' + BODY, r.soft && r.soft[j] ? SOFT : INK, c.right ? 'right' : 'left', c.w - 28); x += c.w; });
      this.y += rh;
    });
    this.y += 16;
  }
  // number tiles in a row: [[big, small], ...]
  tiles(items, opts = {}) {
    if (!items.length) return;
    const per = opts.per || Math.min(4, items.length), gap = 18, tw = (PW - 2 * M - gap * (per - 1)) / per, th = opts.h || 150;
    for (let i = 0; i < items.length; i += per) {
      const g = this.need(th + gap);
      items.slice(i, i + per).forEach((t, j) => {
        const x = M + j * (tw + gap);
        g.fillStyle = CARD; rr(g, x, this.y, tw, th, 22); g.fill(); g.strokeStyle = LINE; g.lineWidth = 2; g.stroke();
        txt(g, String(t[0]), x + 26, this.y + th * 0.52, '900 ' + (opts.big || 54) + 'px ' + BODY, t[2] || BLUE, 'left', tw - 44);
        const ls = wrap(g, t[1], '700 21px ' + BODY, tw - 44); ls.slice(0, 2).forEach((l, k) => txt(g, l, x + 26, this.y + th * 0.52 + 34 + k * 25, '700 21px ' + BODY, SOFT));
      });
      this.y += th + gap;
    }
  }
  // finish: page numbers on every page, then pack into a PDF file
  finish(filename, footer) {
    const n = this.pages.length;
    this.pages.forEach((c, i) => {
      const g = c.getContext('2d');
      txt(g, 'prequel', M, PH - 56, '900 22px ' + BODY, SOFT);
      txt(g, footer || '', PW / 2, PH - 56, '700 20px ' + BODY, SOFT, 'center');
      txt(g, 'page ' + (i + 1) + ' of ' + n, PW - M, PH - 56, '700 20px ' + BODY, SOFT, 'right');
    });
    const bytes = makePDF(this.pages);
    return new File([bytes], filename, { type: 'application/pdf' });
  }
}

// ---------- the PDF itself ----------
function jpegBytes(c) { const b64 = c.toDataURL('image/jpeg', 0.9).split(',')[1], s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
export function makePDF(pages) {
  const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
  const put = x => { const u = typeof x === 'string' ? enc.encode(x) : x; parts.push(u); len += u.length; };
  const obj = (id, body, stream) => {
    offs[id] = len; put(id + ' 0 obj\n' + body);
    if (stream) { put('\nstream\n'); put(stream); put('\nendstream'); }
    put('\nendobj\n');
  };
  const W = 595.28, H = 841.89, n = pages.length;
  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const kids = pages.map((_, i) => (3 + i * 3) + ' 0 R').join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + n + ' >>');
  pages.forEach((c, i) => {
    const p = 3 + i * 3, img = jpegBytes(c), draw = enc.encode('q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q');
    obj(p, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 ' + (p + 2) + ' 0 R >> >> /Contents ' + (p + 1) + ' 0 R >>');
    obj(p + 1, '<< /Length ' + draw.length + ' >>', draw);
    obj(p + 2, '<< /Type /XObject /Subtype /Image /Width ' + c.width + ' /Height ' + c.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + img.length + ' >>', img);
  });
  const xref = len, total = 3 + n * 3;
  let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
  for (let i = 1; i < total; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  put(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
  const out = new Uint8Array(len); let o = 0; parts.forEach(u => { out.set(u, o); o += u.length; }); return out;
}

// share a ready file (call straight from a tap so the phone allows it), or save it
export async function shareFile(file) {
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return 'saved';
}

export type RGBA = [number, number, number, number];

export function hexToRgba(hex: string, alpha = 1): RGBA {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, Math.round(alpha * 255)];
}

export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const ctxOf = (c: HTMLCanvasElement) => c.getContext("2d", { willReadFrequently: true })!;

export function floodFill(canvas: HTMLCanvasElement, sx: number, sy: number, fill: RGBA, tolerance: number) {
  const { width: w, height: h } = canvas;
  const x0 = Math.floor(sx), y0 = Math.floor(sy);
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return;
  const ctx = ctxOf(canvas);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const i0 = (y0 * w + x0) * 4;
  const target = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
  const tol = tolerance * tolerance * 3;
  const matches = (i: number) => {
    const dr = d[i] - target[0], dg = d[i + 1] - target[1], db = d[i + 2] - target[2];
    return dr * dr + dg * dg + db * db <= tol && Math.abs(d[i + 3] - target[3]) <= tolerance;
  };
  if (target.every((v, k) => Math.abs(v - fill[k]) <= 1)) return;
  const seen = new Uint8Array(w * h);
  const stack = [x0, y0];
  while (stack.length) {
    const y = stack.pop()!, x = stack.pop()!;
    let lx = x;
    while (lx >= 0 && !seen[y * w + lx] && matches((y * w + lx) * 4)) lx--;
    lx++;
    let above = false, below = false;
    for (let cx = lx; cx < w && !seen[y * w + cx] && matches((y * w + cx) * 4); cx++) {
      const p = y * w + cx;
      seen[p] = 1;
      d.set(fill, p * 4);
      if (y > 0) {
        const up = matches(((y - 1) * w + cx) * 4) && !seen[p - w];
        if (up && !above) stack.push(cx, y - 1);
        above = up;
      }
      if (y < h - 1) {
        const dn = matches(((y + 1) * w + cx) * 4) && !seen[p + w];
        if (dn && !below) stack.push(cx, y + 1);
        below = dn;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function warp(canvas: HTMLCanvasElement, cx: number, cy: number, radius: number, amount: number) {
  const r = Math.max(4, Math.round(radius));
  const x0 = Math.max(0, Math.round(cx - r)), y0 = Math.max(0, Math.round(cy - r));
  const x1 = Math.min(canvas.width, Math.round(cx + r)), y1 = Math.min(canvas.height, Math.round(cy + r));
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const ctx = ctxOf(canvas);
  const src = ctx.getImageData(x0, y0, w, h);
  const out = ctx.createImageData(w, h);
  const s = src.data, o = out.data;
  const power = 1 + amount;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + x0 - cx, dy = y + y0 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) / r;
      let sx = x, sy = y;
      if (dist < 1 && dist > 0) {
        const f = Math.pow(dist, power) / dist;
        sx = Math.round(cx + dx * f - x0);
        sy = Math.round(cy + dy * f - y0);
      }
      const si = (Math.min(h - 1, Math.max(0, sy)) * w + Math.min(w - 1, Math.max(0, sx))) * 4;
      const oi = (y * w + x) * 4;
      o[oi] = s[si]; o[oi + 1] = s[si + 1]; o[oi + 2] = s[si + 2]; o[oi + 3] = s[si + 3];
    }
  }
  ctx.putImageData(out, x0, y0);
}

function mapPixels(canvas: HTMLCanvasElement, fn: (d: Uint8ClampedArray, i: number) => void) {
  const ctx = ctxOf(canvas);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < img.data.length; i += 4) fn(img.data, i);
  ctx.putImageData(img, 0, 0);
}

export const invert = (c: HTMLCanvasElement) =>
  mapPixels(c, (d, i) => {
    d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2];
  });

export const grayscale = (c: HTMLCanvasElement) =>
  mapPixels(c, (d, i) => {
    const g = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    d[i] = d[i + 1] = d[i + 2] = g;
  });

export const deepFry = (c: HTMLCanvasElement) =>
  mapPixels(c, (d, i) => {
    for (let k = 0; k < 3; k++) {
      let v = (d[i + k] - 128) * 1.9 + 128 + (Math.random() - 0.5) * 50;
      if (k === 0) v += 25;
      if (k === 2) v -= 35;
      d[i + k] = v;
    }
    const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
    for (let k = 0; k < 3; k++) d[i + k] = avg + (d[i + k] - avg) * 1.8;
  });

export function pixelate(c: HTMLCanvasElement, block: number) {
  const b = Math.max(2, Math.round(block));
  const tmp = document.createElement("canvas");
  tmp.width = Math.max(1, Math.ceil(c.width / b));
  tmp.height = Math.max(1, Math.ceil(c.height / b));
  tmp.getContext("2d")!.drawImage(c, 0, 0, tmp.width, tmp.height);
  const ctx = c.getContext("2d")!;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage(tmp, 0, 0, c.width, c.height);
  ctx.restore();
}

export function flip(c: HTMLCanvasElement, horizontal: boolean) {
  const tmp = document.createElement("canvas");
  tmp.width = c.width;
  tmp.height = c.height;
  tmp.getContext("2d")!.drawImage(c, 0, 0);
  const ctx = c.getContext("2d")!;
  ctx.save();
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.translate(horizontal ? c.width : 0, horizontal ? 0 : c.height);
  ctx.scale(horizontal ? -1 : 1, horizontal ? 1 : -1);
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();
}

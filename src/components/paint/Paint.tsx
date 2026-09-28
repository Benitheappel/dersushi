"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VORLAGEN } from "@/content/wettbewerb";
import { pixelIconSrc } from "@/components/PixelIcon";
import { deepFry, flip, floodFill, grayscale, hexToRgba, invert, pixelate, rgbToHex, warp } from "./effects";
import styles from "./paint.module.css";

type Tool =
  | "pinsel"
  | "radierer"
  | "spray"
  | "linie"
  | "rechteck"
  | "ellipse"
  | "fuellen"
  | "pipette"
  | "text"
  | "sticker"
  | "auswahl"
  | "lasso"
  | "aufblasen"
  | "schrumpfen";

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: "pinsel", label: "Pinsel", hint: "Freihand malen." },
  { id: "radierer", label: "Radierer", hint: "Weiß übermalen." },
  { id: "spray", label: "Sprühdose", hint: "Gedrückt halten zum Sprühen." },
  { id: "fuellen", label: "Füllen", hint: "Fläche mit Farbe füllen." },
  { id: "linie", label: "Linie", hint: "Ziehen für eine gerade Linie." },
  { id: "rechteck", label: "Rechteck", hint: "Ziehen für ein Rechteck." },
  { id: "ellipse", label: "Ellipse", hint: "Ziehen für einen Kreis/eine Ellipse." },
  { id: "pipette", label: "Pipette", hint: "Farbe aus dem Bild aufnehmen." },
  { id: "text", label: "Text", hint: "Text eintippen, dann ins Bild klicken. Danach verschieben/skalieren." },
  { id: "sticker", label: "Sticker", hint: "Sticker wählen, dann ins Bild klicken." },
  { id: "auswahl", label: "Auswahl", hint: "Rechteck ausschneiden, dann verschieben oder an den Ecken größer/kleiner ziehen." },
  { id: "lasso", label: "Lasso", hint: "Freie Form ausschneiden (z. B. das Gesicht), dann verschieben/skalieren." },
  { id: "aufblasen", label: "Aufblasen", hint: "Drüberziehen bläst Stellen auf (Nase, Augen …)." },
  { id: "schrumpfen", label: "Schrumpfen", hint: "Drüberziehen lässt Stellen schrumpfen." },
];

const PALETTE = [
  "#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080", "#800080", "#808040", "#004040", "#0080ff", "#004080", "#8000ff", "#804000",
  "#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffff80", "#00ff80", "#80ffff", "#8080ff", "#ff0080", "#ff8040",
];

const STICKERS = ["sushi", "😎", "👑", "🎩", "🤡", "🥸", "👀", "👄", "💀", "🔥", "💥", "⭐", "🧀", "🦆"];

const FONTS = [
  { id: "impact", label: "Meme (Impact)", css: 'Impact, "Arial Black", sans-serif', bold: false },
  { id: "comic", label: "Comic Sans", css: '"Comic Sans MS", "Comic Neue", cursive', bold: true },
  { id: "pixel", label: "Pixel", css: "", bold: true },
  { id: "arial", label: "Arial", css: "Arial, Helvetica, sans-serif", bold: true },
  { id: "times", label: "Times", css: '"Times New Roman", serif', bold: false },
];

const MAX_SIDE = 800;
const MIN_EDIT = 16;
const MAX_EDIT = 1200;
const HISTORY_LIMIT = 15;
const PERCENTS = [25, 50, 75, 125, 150, 200];

type ResizeMode = "strecken" | "leinwand";

type Pt = { x: number; y: number };
type Floating = { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number };
type Drag =
  | { kind: "move"; dx: number; dy: number }
  | { kind: "scale"; ax: number; ay: number; ratio: number }
  | { kind: "stroke"; points: Pt[] }
  | { kind: "shape"; a: Pt; b: Pt }
  | { kind: "select"; a: Pt; b: Pt }
  | { kind: "lasso"; points: Pt[] }
  | { kind: "spray"; at: Pt; timer: number }
  | { kind: "warp"; last: Pt };

const newCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

function rotated(src: HTMLCanvasElement, deg: number) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
  const out = newCanvas(src.width * cos + src.height * sin, src.width * sin + src.height * cos);
  const ctx = out.getContext("2d")!;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return out;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export type Compressed = { blob: Blob; ext: "webp" | "jpg" };
export type PaintHandle = { exportSigned: (signature: string) => Promise<Compressed | null>; template: number };

const TARGET_BYTES = 250 * 1024;

const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((r) => c.toBlob(r, type, q));

async function compress(c: HTMLCanvasElement): Promise<Compressed | null> {
  const qualities = [0.82, 0.72, 0.62, 0.5];
  const probe = await toBlob(c, "image/webp", qualities[0]);
  const webp = probe?.type === "image/webp";
  const type = webp ? "image/webp" : "image/jpeg";
  let best: Blob | null = webp ? probe : null;
  for (const q of qualities) {
    const b = q === qualities[0] && best ? best : await toBlob(c, type, q);
    if (!b) continue;
    best = b;
    if (b.size <= TARGET_BYTES) break;
  }
  return best ? { blob: best, ext: webp ? "webp" : "jpg" } : null;
}

function sign(c: HTMLCanvasElement, name: string) {
  const text = name.trim();
  if (!text) return;
  const ctx = c.getContext("2d")!;
  const size = Math.max(16, Math.round(c.height * 0.045));
  ctx.save();
  ctx.font = `italic 700 ${size}px "Segoe Script", "Brush Script MT", "Comic Sans MS", cursive`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size / 6);
  ctx.strokeStyle = "#000";
  const x = c.width - size * 0.6, y = c.height - size * 0.5;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function Thumb({ src }: { src: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const img = ref.current;
    if (img?.complete) setOk(img.naturalWidth > 0);
  }, []);
  return <img ref={ref} src={src} alt="" style={{ visibility: ok ? "visible" : "hidden" }} onLoad={() => setOk(true)} onError={() => setOk(false)} />;
}

function ResizeDialog({
  w,
  h,
  onApply,
  onClose,
}: {
  w: number;
  h: number;
  onApply: (mode: ResizeMode, w: number, h: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<ResizeMode>("strecken");
  const [width, setWidth] = useState(String(w));
  const [height, setHeight] = useState(String(h));
  const [keep, setKeep] = useState(true);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => firstRef.current?.select(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ratio = w / h;
  const fits = (n: number) => Number.isInteger(n) && n >= MIN_EDIT && n <= MAX_EDIT;
  const nw = Math.round(Number(width)), nh = Math.round(Number(height));
  const ok = width !== "" && height !== "" && fits(nw) && fits(nh);

  const changeWidth = (v: string) => {
    setWidth(v);
    if (keep && v !== "" && Number(v) > 0) setHeight(String(Math.max(1, Math.round(Number(v) / ratio))));
  };
  const changeHeight = (v: string) => {
    setHeight(v);
    if (keep && v !== "" && Number(v) > 0) setWidth(String(Math.max(1, Math.round(Number(v) * ratio))));
  };
  const toggleKeep = (on: boolean) => {
    setKeep(on);
    if (on && nw > 0) setHeight(String(Math.max(1, Math.round(nw / ratio))));
  };
  const byPercent = (p: number) => ({ w: Math.round((w * p) / 100), h: Math.round((h * p) / 100) });

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className={`win-panel ${styles.dialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resize-title"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onApply(mode, nw, nh);
        }}
      >
        <div className="win-titlebar">
          <h2 id="resize-title" style={{ font: "inherit" }}>
            Bildgröße ändern
          </h2>
          <button type="button" className={styles.x} aria-label="Abbrechen" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.dialogBody}>
          <p className={styles.dialogHint}>
            Aktuell: {w} × {h} px
          </p>

          <fieldset className="win-group">
            <legend>Was soll passieren?</legend>
            <label className={styles.radio}>
              <input type="radio" name="resize-mode" checked={mode === "strecken"} onChange={() => setMode("strecken")} />
              <span>
                <b>Bild skalieren</b> — das ganze Bild wird größer/kleiner, gestreckt oder gestaucht.
              </span>
            </label>
            <label className={styles.radio}>
              <input type="radio" name="resize-mode" checked={mode === "leinwand"} onChange={() => setMode("leinwand")} />
              <span>
                <b>Leinwand ändern</b> — größer gibt einen weißen Rand, kleiner schneidet den Rand ab (von der Mitte aus).
              </span>
            </label>
          </fieldset>

          <div className={styles.sizeFields}>
            <label>
              Breite (px)
              <input
                ref={firstRef}
                className={styles.field}
                type="number"
                inputMode="numeric"
                min={MIN_EDIT}
                max={MAX_EDIT}
                value={width}
                aria-invalid={width !== "" && !fits(nw)}
                onChange={(e) => changeWidth(e.target.value)}
              />
            </label>
            <span aria-hidden="true">×</span>
            <label>
              Höhe (px)
              <input
                className={styles.field}
                type="number"
                inputMode="numeric"
                min={MIN_EDIT}
                max={MAX_EDIT}
                value={height}
                aria-invalid={height !== "" && !fits(nh)}
                onChange={(e) => changeHeight(e.target.value)}
              />
            </label>
          </div>

          <label className={styles.radio}>
            <input type="checkbox" checked={keep} onChange={(e) => toggleKeep(e.target.checked)} />
            <span>Seitenverhältnis beibehalten</span>
          </label>

          <div className={styles.presets} role="group" aria-label="Schnellauswahl in Prozent">
            {PERCENTS.map((p) => {
              const s = byPercent(p);
              return (
                <button
                  key={p}
                  type="button"
                  className="btn"
                  disabled={!fits(s.w) || !fits(s.h)}
                  onClick={() => {
                    setWidth(String(s.w));
                    setHeight(String(s.h));
                  }}
                >
                  {p}%
                </button>
              );
            })}
          </div>

          <p className={ok ? styles.dialogHint : styles.dialogError} role="status">
            {ok
              ? `Neu: ${nw} × ${nh} px (${Math.round((nw / w) * 100)} % × ${Math.round((nh / h) * 100)} %)`
              : `Breite und Höhe müssen zwischen ${MIN_EDIT} und ${MAX_EDIT} px liegen.`}
          </p>

          <div className={styles.dialogButtons}>
            <button type="submit" className="btn" disabled={!ok}>
              OK
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Abbrechen
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function Paint({ onSubmit }: { onSubmit: (h: PaintHandle) => void }) {
  const mainRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState(1);
  const [tool, setTool] = useState<Tool>("pinsel");
  const [color, setColor] = useState("#ff0000");
  const [size, setSize] = useState(12);
  const [opacity, setOpacity] = useState(100);
  const [filled, setFilled] = useState(false);
  const [tolerance, setTolerance] = useState(40);
  const [strength, setStrength] = useState(40);
  const [lockRatio, setLockRatio] = useState(true);
  const [text, setText] = useState("SUSHI");
  const [font, setFont] = useState(FONTS[0].id);
  const [fontSize, setFontSize] = useState(64);
  const [outline, setOutline] = useState(true);
  const [sticker, setSticker] = useState(STICKERS[1]);
  const [hasFloating, setHasFloating] = useState(false);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [missing, setMissing] = useState(false);
  const [resizing, setResizing] = useState(false);

  const floating = useRef<Floating | null>(null);
  const drag = useRef<Drag | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const dirty = useRef(false);
  const raf = useRef(0);
  const opts = useRef({ tool, color, size, opacity, filled, tolerance, strength, lockRatio, text, font, fontSize, outline, sticker });
  opts.current = { tool, color, size, opacity, filled, tolerance, strength, lockRatio, text, font, fontSize, outline, sticker };

  const main = () => mainRef.current!;
  const mctx = () => main().getContext("2d", { willReadFrequently: true })!;
  const k = () => main().width / Math.max(1, main().getBoundingClientRect().width);

  const syncHistory = () => setHistory({ undo: undoStack.current.length, redo: redoStack.current.length });

  const setCanvasSize = (w: number, h: number) => {
    const c = main(), o = overlayRef.current!;
    c.width = o.width = w;
    c.height = o.height = h;
    setDims({ w, h });
  };

  const restore = (img: ImageData) => {
    const c = main();
    if (img.width !== c.width || img.height !== c.height) setCanvasSize(img.width, img.height);
    mctx().putImageData(img, 0, 0);
  };

  const pushHistory = useCallback(() => {
    const c = main();
    undoStack.current.push(mctx().getImageData(0, 0, c.width, c.height));
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
    redoStack.current = [];
    dirty.current = true;
    syncHistory();
  }, []);

  const drawOverlay = useCallback((extra?: (ctx: CanvasRenderingContext2D, px: number) => void) => {
    const o = overlayRef.current;
    if (!o) return;
    const ctx = o.getContext("2d")!;
    ctx.clearRect(0, 0, o.width, o.height);
    const px = k();
    const f = floating.current;
    if (f) {
      ctx.drawImage(f.canvas, f.x, f.y, f.w, f.h);
      ctx.save();
      ctx.lineWidth = px;
      ctx.setLineDash([4 * px, 3 * px]);
      ctx.strokeStyle = "#000";
      ctx.strokeRect(f.x, f.y, f.w, f.h);
      ctx.lineDashOffset = 4 * px;
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(f.x, f.y, f.w, f.h);
      ctx.restore();
      const hs = 10 * px;
      ctx.fillStyle = "#000080";
      for (const [cx, cy] of [[f.x, f.y], [f.x + f.w, f.y], [f.x, f.y + f.h], [f.x + f.w, f.y + f.h]]) {
        ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
      }
    }
    extra?.(ctx, px);
  }, []);

  const requestOverlay = (extra?: (ctx: CanvasRenderingContext2D, px: number) => void) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => drawOverlay(extra));
  };

  const commitFloating = useCallback(() => {
    const f = floating.current;
    if (!f) return;
    mctx().drawImage(f.canvas, f.x, f.y, f.w, f.h);
    floating.current = null;
    setHasFloating(false);
    drawOverlay();
  }, [drawOverlay]);

  const setFloating = (f: Floating | null) => {
    floating.current = f;
    setHasFloating(!!f);
    drawOverlay();
  };

  const placeFloating = (src: HTMLCanvasElement, x: number, y: number, maxFrac = 0.5) => {
    commitFloating();
    pushHistory();
    const c = main();
    const s = Math.min(1, (c.width * maxFrac) / src.width, (c.height * maxFrac) / src.height);
    const w = src.width * s, h = src.height * s;
    setFloating({ canvas: src, x: x - w / 2, y: y - h / 2, w, h });
  };

  const renderText = (): HTMLCanvasElement | null => {
    const o = opts.current;
    const str = o.text.trim();
    if (!str) return null;
    const f = FONTS.find((x) => x.id === o.font) ?? FONTS[0];
    const family = f.id === "pixel" ? getComputedStyle(document.body).getPropertyValue("--font-pixel").trim() || "monospace" : f.css;
    const cssFont = `${f.bold ? "700 " : ""}${o.fontSize}px ${family}`;
    const measure = newCanvas(1, 1).getContext("2d")!;
    measure.font = cssFont;
    const pad = Math.ceil(o.fontSize * 0.2);
    const c = newCanvas(measure.measureText(str).width + pad * 2, o.fontSize * 1.3 + pad * 2);
    const ctx = c.getContext("2d")!;
    ctx.font = cssFont;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    if (o.outline) {
      ctx.lineWidth = Math.max(2, o.fontSize / 8);
      ctx.strokeStyle = o.color.toLowerCase() === "#000000" ? "#ffffff" : "#000000";
      ctx.strokeText(str, pad, c.height / 2);
    }
    ctx.fillStyle = o.color;
    ctx.fillText(str, pad, c.height / 2);
    return c;
  };

  const renderSticker = async (id: string): Promise<HTMLCanvasElement> => {
    if (id === "sushi") {
      const img = await loadImage(pixelIconSrc("sushi"));
      const c = newCanvas(320, 220);
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return c;
    }
    const c = newCanvas(240, 240);
    const ctx = c.getContext("2d")!;
    ctx.font = '200px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(id, 120, 132);
    return c;
  };

  const loadTemplate = useCallback(
    async (n: number) => {
      floating.current = null;
      setHasFloating(false);
      undoStack.current = [];
      redoStack.current = [];
      dirty.current = false;
      syncHistory();
      const c = main(), o = overlayRef.current!;
      try {
        const img = await loadImage(VORLAGEN[n - 1].src);
        const s = MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight);
        c.width = o.width = Math.round(img.naturalWidth * s);
        c.height = o.height = Math.round(img.naturalHeight * s);
        const ctx = mctx();
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        setMissing(false);
      } catch {
        c.width = o.width = 640;
        c.height = o.height = 800;
        const ctx = mctx();
        ctx.fillStyle = "#c0c0c0";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#ffe0bd";
        ctx.beginPath();
        ctx.ellipse(320, 380, 190, 240, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        for (const ex of [250, 390]) {
          ctx.beginPath();
          ctx.arc(ex, 330, 18, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(320, 450, 80, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.font = "700 28px Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`FOTO ${n} FEHLT NOCH`, 320, 700);
        setMissing(true);
      }
      setDims({ w: c.width, h: c.height });
      drawOverlay();
    },
    [drawOverlay],
  );

  useEffect(() => {
    loadTemplate(template);
  }, [template, loadTemplate]);

  const chooseTemplate = (n: number) => {
    if (n === template) return;
    if (dirty.current && !window.confirm("Anderes Foto nehmen? Deine Änderungen gehen dabei verloren.")) return;
    setTemplate(n);
  };

  const undo = useCallback(() => {
    floating.current = null;
    setHasFloating(false);
    const prev = undoStack.current.pop();
    if (prev) {
      const c = main();
      redoStack.current.push(mctx().getImageData(0, 0, c.width, c.height));
      restore(prev);
    }
    syncHistory();
    drawOverlay();
  }, [drawOverlay]);

  const redo = useCallback(() => {
    commitFloating();
    const next = redoStack.current.pop();
    if (next) {
      const c = main();
      undoStack.current.push(mctx().getImageData(0, 0, c.width, c.height));
      restore(next);
    }
    syncHistory();
    drawOverlay();
  }, [commitFloating, drawOverlay]);

  const pos = (e: React.PointerEvent): Pt => {
    const r = overlayRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * main().width) / r.width, y: ((e.clientY - r.top) * main().height) / r.height };
  };

  const hitFloating = (p: Pt): "move" | { ax: number; ay: number } | null => {
    const f = floating.current;
    if (!f) return null;
    const hs = 12 * k();
    const corners: [number, number, number, number][] = [
      [f.x, f.y, f.x + f.w, f.y + f.h],
      [f.x + f.w, f.y, f.x, f.y + f.h],
      [f.x, f.y + f.h, f.x + f.w, f.y],
      [f.x + f.w, f.y + f.h, f.x, f.y],
    ];
    for (const [cx, cy, ax, ay] of corners) if (Math.abs(p.x - cx) <= hs && Math.abs(p.y - cy) <= hs) return { ax, ay };
    if (p.x >= f.x && p.x <= f.x + f.w && p.y >= f.y && p.y <= f.y + f.h) return "move";
    return null;
  };

  const spray = (at: Pt) => {
    const o = opts.current;
    const ctx = mctx();
    ctx.fillStyle = o.color;
    const n = Math.max(6, o.size * 1.5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * o.size;
      ctx.fillRect(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r, 1.5, 1.5);
    }
  };

  const strokePreview = (points: Pt[], eraser: boolean) => (ctx: CanvasRenderingContext2D) => {
    const o = opts.current;
    ctx.save();
    ctx.globalAlpha = eraser ? 1 : o.opacity / 100;
    ctx.strokeStyle = eraser ? "#ffffff" : o.color;
    ctx.lineWidth = o.size;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
    if (points.length === 1) ctx.lineTo(points[0].x + 0.01, points[0].y);
    ctx.stroke();
    ctx.restore();
  };

  const shapePreview = (tool: Tool, a: Pt, b: Pt) => (ctx: CanvasRenderingContext2D) => {
    const o = opts.current;
    ctx.save();
    ctx.globalAlpha = o.opacity / 100;
    ctx.strokeStyle = ctx.fillStyle = o.color;
    ctx.lineWidth = o.size;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (tool === "linie") {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    } else if (tool === "rechteck") {
      ctx.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      if (o.filled) ctx.fill();
      else ctx.stroke();
    } else {
      ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
      if (o.filled) ctx.fill();
      else ctx.stroke();
    }
    ctx.restore();
  };

  const marquee = (draw: (ctx: CanvasRenderingContext2D) => void) => (ctx: CanvasRenderingContext2D, px: number) => {
    ctx.save();
    ctx.lineWidth = px;
    ctx.setLineDash([4 * px, 3 * px]);
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    draw(ctx);
    ctx.stroke();
    ctx.restore();
  };

  const onDown = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const p = pos(e);
    const o = opts.current;

    const hit = hitFloating(p);
    if (hit === "move") {
      const f = floating.current!;
      drag.current = { kind: "move", dx: p.x - f.x, dy: p.y - f.y };
      return;
    }
    if (hit) {
      const f = floating.current!;
      drag.current = { kind: "scale", ax: hit.ax, ay: hit.ay, ratio: f.w / f.h };
      return;
    }
    commitFloating();

    switch (o.tool) {
      case "pinsel":
      case "radierer":
        drag.current = { kind: "stroke", points: [p] };
        requestOverlay(strokePreview([p], o.tool === "radierer"));
        break;
      case "spray": {
        pushHistory();
        spray(p);
        const timer = window.setInterval(() => {
          const d = drag.current;
          if (d?.kind === "spray") spray(d.at);
        }, 30);
        drag.current = { kind: "spray", at: p, timer };
        break;
      }
      case "linie":
      case "rechteck":
      case "ellipse":
        drag.current = { kind: "shape", a: p, b: p };
        break;
      case "fuellen":
        pushHistory();
        floodFill(main(), p.x, p.y, hexToRgba(o.color), o.tolerance);
        break;
      case "pipette": {
        const d = mctx().getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
        setColor(rgbToHex(d[0], d[1], d[2]));
        break;
      }
      case "auswahl":
        drag.current = { kind: "select", a: p, b: p };
        break;
      case "lasso":
        drag.current = { kind: "lasso", points: [p] };
        break;
      case "aufblasen":
      case "schrumpfen":
        pushHistory();
        warp(main(), p.x, p.y, o.size * 2, (o.tool === "aufblasen" ? 1 : -1) * (o.strength / 100) * 0.9);
        drag.current = { kind: "warp", last: p };
        break;
      case "text": {
        const c = renderText();
        if (c) placeFloating(c, p.x, p.y, 0.9);
        break;
      }
      case "sticker":
        placeFloating(await renderSticker(o.sticker), p.x, p.y, 0.35);
        break;
    }
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = pos(e);
    const o = opts.current;
    const f = floating.current;
    switch (d.kind) {
      case "move":
        if (f) {
          f.x = p.x - d.dx;
          f.y = p.y - d.dy;
          requestOverlay();
        }
        break;
      case "scale":
        if (f) {
          let w = Math.max(4, Math.abs(p.x - d.ax));
          let h = Math.max(4, Math.abs(p.y - d.ay));
          if (o.lockRatio) {
            w = Math.max(w, h * d.ratio);
            h = w / d.ratio;
          }
          f.w = w;
          f.h = h;
          f.x = p.x < d.ax ? d.ax - w : d.ax;
          f.y = p.y < d.ay ? d.ay - h : d.ay;
          requestOverlay();
        }
        break;
      case "stroke":
        d.points.push(p);
        requestOverlay(strokePreview(d.points, o.tool === "radierer"));
        break;
      case "spray":
        d.at = p;
        spray(p);
        break;
      case "shape":
        d.b = p;
        requestOverlay(shapePreview(o.tool, d.a, d.b));
        break;
      case "select":
        d.b = p;
        requestOverlay(marquee((ctx) => ctx.rect(Math.min(d.a.x, d.b.x), Math.min(d.a.y, d.b.y), Math.abs(d.b.x - d.a.x), Math.abs(d.b.y - d.a.y))));
        break;
      case "lasso":
        d.points.push(p);
        requestOverlay(
          marquee((ctx) => {
            ctx.moveTo(d.points[0].x, d.points[0].y);
            for (const q of d.points) ctx.lineTo(q.x, q.y);
          }),
        );
        break;
      case "warp":
        if (Math.hypot(p.x - d.last.x, p.y - d.last.y) >= Math.max(3, o.size / 3)) {
          warp(main(), p.x, p.y, o.size * 2, (o.tool === "aufblasen" ? 1 : -1) * (o.strength / 100) * 0.9);
          d.last = p;
        }
        break;
    }
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const o = opts.current;
    const c = main();
    const ctx = mctx();
    switch (d.kind) {
      case "stroke":
        pushHistory();
        strokePreview(d.points, o.tool === "radierer")(ctx);
        drawOverlay();
        break;
      case "spray":
        clearInterval(d.timer);
        break;
      case "shape":
        if (Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) > 1) {
          pushHistory();
          shapePreview(o.tool, d.a, d.b)(ctx);
        }
        drawOverlay();
        break;
      case "select": {
        const x = Math.max(0, Math.min(d.a.x, d.b.x)), y = Math.max(0, Math.min(d.a.y, d.b.y));
        const w = Math.min(c.width - x, Math.abs(d.b.x - d.a.x)), h = Math.min(c.height - y, Math.abs(d.b.y - d.a.y));
        if (w < 3 || h < 3) return drawOverlay();
        pushHistory();
        const piece = newCanvas(w, h);
        piece.getContext("2d")!.drawImage(c, x, y, w, h, 0, 0, w, h);
        ctx.fillStyle = "#fff";
        ctx.fillRect(x, y, w, h);
        setFloating({ canvas: piece, x, y, w: piece.width, h: piece.height });
        break;
      }
      case "lasso": {
        if (d.points.length < 4) return drawOverlay();
        const xs = d.points.map((q) => q.x), ys = d.points.map((q) => q.y);
        const x = Math.max(0, Math.floor(Math.min(...xs))), y = Math.max(0, Math.floor(Math.min(...ys)));
        const w = Math.min(c.width, Math.ceil(Math.max(...xs))) - x, h = Math.min(c.height, Math.ceil(Math.max(...ys))) - y;
        if (w < 3 || h < 3) return drawOverlay();
        pushHistory();
        const path = new Path2D();
        path.moveTo(d.points[0].x, d.points[0].y);
        for (const q of d.points) path.lineTo(q.x, q.y);
        path.closePath();
        const piece = newCanvas(w, h);
        const pctx = piece.getContext("2d")!;
        pctx.translate(-x, -y);
        pctx.clip(path);
        pctx.drawImage(c, 0, 0);
        ctx.fillStyle = "#fff";
        ctx.fill(path);
        setFloating({ canvas: piece, x, y, w: piece.width, h: piece.height });
        break;
      }
    }
  };

  const applyEffect = (fx: (c: HTMLCanvasElement) => void) => {
    const f = floating.current;
    if (f) {
      fx(f.canvas);
      drawOverlay();
      return;
    }
    pushHistory();
    fx(main());
  };

  const transformFloating = (fn: (c: HTMLCanvasElement) => HTMLCanvasElement) => {
    const f = floating.current;
    if (!f) return;
    const scale = f.w / f.canvas.width;
    const next = fn(f.canvas);
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    f.canvas = next;
    f.w = next.width * scale;
    f.h = next.height * scale;
    f.x = cx - f.w / 2;
    f.y = cy - f.h / 2;
    drawOverlay();
  };

  const stampFloating = () => {
    const f = floating.current;
    if (!f) return;
    mctx().drawImage(f.canvas, f.x, f.y, f.w, f.h);
    const copy = newCanvas(f.canvas.width, f.canvas.height);
    copy.getContext("2d")!.drawImage(f.canvas, 0, 0);
    setFloating({ ...f, canvas: copy, x: f.x + 20 * k(), y: f.y + 20 * k() });
  };

  const deleteFloating = () => setFloating(null);

  const insertImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const src = newCanvas(img.naturalWidth, img.naturalHeight);
      src.getContext("2d")!.drawImage(img, 0, 0);
      setTool("auswahl");
      placeFloating(src, main().width / 2, main().height / 2, 0.6);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const resizeImage = (mode: ResizeMode, w: number, h: number) => {
    setResizing(false);
    const c = main();
    if (w === c.width && h === c.height) return;
    commitFloating();
    pushHistory();
    const old = newCanvas(c.width, c.height);
    old.getContext("2d")!.drawImage(c, 0, 0);
    setCanvasSize(w, h);
    const ctx = mctx();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    if (mode === "strecken") {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(old, 0, 0, w, h);
    } else {
      ctx.drawImage(old, Math.round((w - old.width) / 2), Math.round((h - old.height) / 2));
    }
    drawOverlay();
  };

  const exportJpeg = useCallback(async () => {
    commitFloating();
    return toBlob(main(), "image/jpeg", 0.9);
  }, [commitFloating]);

  const exportSigned = useCallback(
    async (signature: string) => {
      commitFloating();
      const c = main();
      const s = Math.min(1, MAX_SIDE / Math.max(c.width, c.height));
      const copy = newCanvas(c.width * s, c.height * s);
      const cctx = copy.getContext("2d")!;
      cctx.imageSmoothingQuality = "high";
      cctx.drawImage(c, 0, 0, copy.width, copy.height);
      sign(copy, signature);
      return compress(copy);
    },
    [commitFloating],
  );

  const download = async () => {
    const blob = await exportJpeg();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sushi-verunstaltet-${template}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const pickTool = (t: Tool) => {
    if (floating.current && !(t === tool && (t === "text" || t === "sticker"))) commitFloating();
    setTool(t);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest('[role="dialog"]'))) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && floating.current) {
        e.preventDefault();
        deleteFloating();
      } else if ((e.key === "Enter" || e.key === "Escape") && floating.current) {
        commitFloating();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, commitFloating]);

  useEffect(() => {
    const onResize = () => drawOverlay();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawOverlay]);

  const current = TOOLS.find((t) => t.id === tool)!;
  const usesSize = ["pinsel", "radierer", "spray", "linie", "rechteck", "ellipse", "aufblasen", "schrumpfen"].includes(tool);
  const usesOpacity = ["pinsel", "linie", "rechteck", "ellipse"].includes(tool);

  return (
    <div className={`win-panel ${styles.paint}`}>
      <div className="win-titlebar">
        <span>SUSHI PAINT — foto-{template}.jpg</span>
      </div>

      <div className={styles.templates} role="group" aria-label="Foto auswählen">
        {VORLAGEN.map((v) => (
          <button
            key={v.nummer}
            type="button"
            className={styles.thumb}
            aria-pressed={v.nummer === template}
            onClick={() => chooseTemplate(v.nummer)}
            title={`Foto ${v.nummer}`}
            aria-label={`Foto ${v.nummer}`}
          >
            <Thumb src={v.src} />
            <span>{v.nummer}</span>
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn" onClick={undo} disabled={!history.undo && !hasFloating} title="Strg+Z">
          ↶ Rückgängig
        </button>
        <button type="button" className="btn" onClick={redo} disabled={!history.redo} title="Strg+Y">
          ↷ Wiederholen
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (!dirty.current || window.confirm("Alles zurücksetzen?")) loadTemplate(template);
          }}
        >
          Neu
        </button>
        <span className={styles.sep} />
        <button
          type="button"
          className="btn"
          onClick={() => {
            commitFloating();
            setResizing(true);
          }}
          title="Breite und Höhe ändern, hoch- oder runterskalieren"
        >
          Bildgröße…
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Bild einfügen…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) insertImage(file);
            e.target.value = "";
          }}
        />
        <span className={styles.sep} />
        <button type="button" className="btn" onClick={download}>
          Speichern
        </button>
        <button type="button" className={`btn ${styles.submit}`} onClick={() => onSubmit({ exportSigned, template })}>
          Einsenden…
        </button>
      </div>

      <div className={styles.effects}>
        <span className={styles.effectsLabel}>Effekte{hasFloating ? " (Auswahl)" : ""}:</span>
        <button type="button" className="btn" onClick={() => applyEffect(deepFry)}>
          Deep-Fry
        </button>
        <button type="button" className="btn" onClick={() => applyEffect((c) => pixelate(c, Math.max(6, c.width / 40)))}>
          Verpixeln
        </button>
        <button type="button" className="btn" onClick={() => applyEffect(grayscale)}>
          Graustufen
        </button>
        <button type="button" className="btn" onClick={() => applyEffect(invert)}>
          Invertieren
        </button>
        <button type="button" className="btn" onClick={() => applyEffect((c) => flip(c, true))}>
          Spiegeln ⇋
        </button>
        <button type="button" className="btn" onClick={() => applyEffect((c) => flip(c, false))}>
          Kopfüber ⇅
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.tools} role="toolbar" aria-label="Werkzeuge">
          {TOOLS.map((t) => (
            <button key={t.id} type="button" className={styles.tool} aria-pressed={t.id === tool} title={t.hint} onClick={() => pickTool(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.main}>
          <div className={styles.options}>
            {usesSize && (
              <label>
                {tool === "aufblasen" || tool === "schrumpfen" ? "Radius" : "Größe"} {size}
                <input type="range" min={1} max={80} value={size} onChange={(e) => setSize(+e.target.value)} />
              </label>
            )}
            {usesOpacity && (
              <label>
                Deckkraft {opacity}%
                <input type="range" min={10} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} />
              </label>
            )}
            {(tool === "rechteck" || tool === "ellipse") && (
              <label className={styles.check}>
                <input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} /> Gefüllt
              </label>
            )}
            {tool === "fuellen" && (
              <label>
                Toleranz {tolerance}
                <input type="range" min={0} max={150} value={tolerance} onChange={(e) => setTolerance(+e.target.value)} />
              </label>
            )}
            {(tool === "aufblasen" || tool === "schrumpfen") && (
              <label>
                Stärke {strength}%
                <input type="range" min={10} max={100} value={strength} onChange={(e) => setStrength(+e.target.value)} />
              </label>
            )}
            {tool === "text" && (
              <>
                <label>
                  Text
                  <input className={styles.field} value={text} maxLength={60} onChange={(e) => setText(e.target.value)} />
                </label>
                <label>
                  Schrift
                  <select className={styles.field} value={font} onChange={(e) => setFont(e.target.value)}>
                    {FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Größe {fontSize}
                  <input type="range" min={12} max={200} value={fontSize} onChange={(e) => setFontSize(+e.target.value)} />
                </label>
                <label className={styles.check}>
                  <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} /> Umrandung
                </label>
              </>
            )}
            {tool === "sticker" && (
              <div className={styles.stickers} role="group" aria-label="Sticker">
                {STICKERS.map((s) => (
                  <button key={s} type="button" aria-pressed={s === sticker} onClick={() => setSticker(s)} title="Sticker wählen">
                    {s === "sushi" ? (
                      <img src={pixelIconSrc("sushi")} alt="Pixel-Sushi" width={24} style={{ imageRendering: "pixelated" }} />
                    ) : (
                      s
                    )}
                  </button>
                ))}
              </div>
            )}
            {(tool === "auswahl" || tool === "lasso" || hasFloating) && (
              <label className={styles.check}>
                <input type="checkbox" checked={lockRatio} onChange={(e) => setLockRatio(e.target.checked)} /> Seitenverhältnis sperren
              </label>
            )}
            {hasFloating && (
              <span className={styles.floatingButtons}>
                <button type="button" className="btn" onClick={() => transformFloating((c) => rotated(c, 15))}>
                  ↻ Drehen
                </button>
                <button type="button" className="btn" onClick={stampFloating} title="Kopie stempeln und weiter verschieben">
                  Stempeln
                </button>
                <button type="button" className="btn" onClick={commitFloating}>
                  Fertig
                </button>
                <button type="button" className="btn" onClick={deleteFloating}>
                  Löschen
                </button>
              </span>
            )}
          </div>

          <div className={styles.workspace}>
            <div
              className={styles.stage}
              style={
                {
                  aspectRatio: dims.w && dims.h ? `${dims.w} / ${dims.h}` : "4 / 5",
                  "--ratio": dims.w && dims.h ? dims.w / dims.h : 0.8,
                  "--px": dims.w ? `${dims.w}px` : "720px",
                } as React.CSSProperties
              }
            >
              <canvas ref={mainRef} className={styles.canvas} aria-label="Zeichenfläche" />
              <canvas
                ref={overlayRef}
                className={`${styles.canvas} ${styles.overlay}`}
                data-tool={tool}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.palette}>
        <span className={styles.current} style={{ background: color }} title={`Aktuelle Farbe ${color}`} />
        <div className={styles.swatches} role="group" aria-label="Farben">
          {PALETTE.map((c) => (
            <button key={c} type="button" style={{ background: c }} aria-label={`Farbe ${c}`} aria-pressed={c === color} onClick={() => setColor(c)} />
          ))}
        </div>
        <label className={styles.custom}>
          Eigene:
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
      </div>

      <div className={styles.status}>
        <span>{current.hint}</span>
        <span>
          {dims.w} × {dims.h}
          {missing ? " — Platzhalter" : ""}
        </span>
      </div>

      {resizing && <ResizeDialog w={dims.w} h={dims.h} onApply={resizeImage} onClose={() => setResizing(false)} />}
    </div>
  );
}

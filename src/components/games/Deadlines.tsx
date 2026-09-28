"use client";

import { useEffect, useRef, useState } from "react";
import { readStore, writeStore } from "@/lib/browser";
import { t } from "@/content/texts";
import styles from "./games.module.css";

const g = t.spiele;
const LABELS = g.fallendeWoerter.length ? g.fallendeWoerter : ["DEADLINE"];

type Box = { x: number; y: number; w: number; h: number; vy: number; label: string };

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

function verdict(s: number) {
  if (s < 5) return g.urteilUnter5Sekunden;
  if (s < 15) return g.urteilUnter15Sekunden;
  if (s < 30) return g.urteilUnter30Sekunden;
  return g.urteilAb30Sekunden;
}

export default function Deadlines() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [hitBy, setHitBy] = useState(LABELS[0]);

  useEffect(() => {
    setBest(Number(readStore("sushi:deadlines-best") ?? 0));
  }, []);

  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = `${state === "over" ? fmt(score) : "0,0"} s`;
  }, [state, score]);

  useEffect(() => {
    if (state !== "playing") return;
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const css = getComputedStyle(document.documentElement);
    const C = {
      bg: css.getPropertyValue("--ink").trim() || "#0b0b0a",
      box: css.getPropertyValue("--paper").trim() || "#efede6",
      boxText: css.getPropertyValue("--ink").trim() || "#0b0b0a",
      me: css.getPropertyValue("--acid").trim() || "#d4ff1e",
      line: "rgba(128,128,128,0.18)",
    };
    const font = `600 12px ${css.getPropertyValue("--f-mono").split(",")[0].trim() || "monospace"}`;

    let W = 0, H = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const me = { x: W / 2, targetX: W / 2, size: 30 };
    const boxes: Box[] = [];
    let elapsed = 0;
    let spawnAcc = 0;
    let last = performance.now();
    let raf = 0;
    const keys = { left: false, right: false };

    const spawn = (difficulty: number) => {
      ctx.font = font;
      const label = LABELS[Math.floor(Math.random() * LABELS.length)];
      const w = ctx.measureText(label).width + 20;
      boxes.push({
        x: Math.random() * Math.max(1, W - w),
        y: -30,
        w,
        h: 26,
        vy: Math.min(900, (150 + Math.random() * 130) * difficulty),
        label,
      });
    };

    const draw = () => {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
        ctx.stroke();
      }
      ctx.font = font;
      ctx.textBaseline = "middle";
      for (const b of boxes) {
        ctx.fillStyle = C.box;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = C.boxText;
        ctx.fillText(b.label, b.x + 10, b.y + b.h / 2 + 1);
      }
      const y = H - me.size - 18;
      ctx.fillStyle = C.me;
      ctx.fillRect(me.x - me.size / 2, y, me.size, me.size);
      ctx.fillStyle = C.boxText;
      ctx.textAlign = "center";
      ctx.fillText(g.spielerFigur, me.x, y + me.size / 2 + 1);
      ctx.textAlign = "left";
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      const difficulty = 1 + elapsed / 12;

      spawnAcc += dt;
      const interval = Math.max(0.2, 0.85 / difficulty);
      while (spawnAcc > interval) {
        spawnAcc -= interval;
        spawn(difficulty);
      }

      if (keys.left) me.targetX -= 560 * dt;
      if (keys.right) me.targetX += 560 * dt;
      me.targetX = Math.min(W - me.size / 2, Math.max(me.size / 2, me.targetX));
      me.x += (me.targetX - me.x) * Math.min(1, dt * 16);

      const py = H - me.size - 18;
      let hit: string | null = null;
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        b.y += b.vy * dt;
        if (b.y > H) {
          boxes.splice(i, 1);
          continue;
        }
        const pad = 4;
        if (
          b.x + pad < me.x + me.size / 2 &&
          b.x + b.w - pad > me.x - me.size / 2 &&
          b.y + pad < py + me.size &&
          b.y + b.h - pad > py
        )
          hit = b.label;
      }

      draw();
      if (liveRef.current) liveRef.current.textContent = `${fmt(elapsed)} s`;

      if (hit) {
        const final = Math.round(elapsed * 10) / 10;
        setScore(final);
        setHitBy(hit);
        setBest((b) => {
          const nb = Math.max(b, final);
          writeStore("sushi:deadlines-best", String(nb));
          return nb;
        });
        setState("over");
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const setFromPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      me.targetX = e.clientX - r.left;
    };
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keys.left = down;
      else if (e.key === "ArrowRight" || e.key === "d") keys.right = down;
      else return;
      e.preventDefault();
    };
    const onDown = onKey(true);
    const onUp = onKey(false);

    canvas.addEventListener("pointermove", setFromPointer);
    canvas.addEventListener("pointerdown", setFromPointer);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", setFromPointer);
      canvas.removeEventListener("pointerdown", setFromPointer);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("resize", resize);
    };
  }, [state]);

  return (
    <div className={styles.dodge}>
      <div className={styles.hud}>
        <span>
          {g.ueberlebt} <span ref={liveRef} />
        </span>
        <span>{g.rekord} {fmt(best)} s</span>
      </div>
      <div ref={wrapRef} className={styles.dodgeArena} data-playing={state === "playing" || undefined}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Spielfeld: den fallenden Deadlines ausweichen" />
        {state !== "playing" && (
          <div className={styles.overlay}>
            {state === "over" ? (
              <>
                <p className={styles.alarm}>{g.erwischtVon} {hitBy}</p>
                <p className={styles.big}>{fmt(score)} s</p>
                <p className={styles.verdict}>{verdict(score)}</p>
              </>
            ) : (
              <>
                <p className={styles.big}>{g.spielTitel}</p>
                <p className={styles.hint}>{g.steuerung}</p>
              </>
            )}
            <button type="button" className="btn" onClick={() => setState("playing")} autoFocus={state === "over"}>
              {state === "over" ? g.nochmalKnopf : g.startKnopf}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

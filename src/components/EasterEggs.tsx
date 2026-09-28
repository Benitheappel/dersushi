"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion, toast } from "@/lib/browser";
import { t } from "@/content/texts";
import PixelSushi from "./PixelSushi";
import styles from "./eggs.module.css";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

type Drop = { id: number; left: number; delay: number; dur: number; size: number; spin: number };

export default function EasterEggs() {
  const [rain, setRain] = useState<Drop[]>([]);

  useEffect(() => {
    const makeItRain = () => {
      if (prefersReducedMotion()) return;
      setRain(
        Array.from({ length: 28 }, (_, i) => ({
          id: Date.now() + i,
          left: Math.random() * 100,
          delay: Math.random() * 0.9,
          dur: 1.6 + Math.random() * 1.4,
          size: 24 + Math.random() * 40,
          spin: (Math.random() - 0.5) * 720,
        })),
      );
      window.setTimeout(() => setRain([]), 4200);
    };

    let konamiPos = 0;
    let typed = "";
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      konamiPos = key === KONAMI[konamiPos] ? konamiPos + 1 : key === "ArrowUp" ? Math.min(2, konamiPos + 1) : 0;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        toast(t.ueberall.meldungKonami);
        makeItRain();
      }

      if (key.length === 1) {
        typed = (typed + key).slice(-5);
        if (typed === "sushi") toast(t.ueberall.meldungSushiGetippt);
      }
    };

    let clicks: number[] = [];
    const onLogo = () => {
      const now = Date.now();
      clicks = [...clicks.filter((c) => now - c < 2500), now];
      if (clicks.length === 4) toast(t.ueberall.meldungLogo4x);
      if (clicks.length >= 7) {
        clicks = [];
        toast(t.ueberall.meldungLogo7x);
        makeItRain();
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("sushi:logo", onLogo);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("sushi:logo", onLogo);
    };
  }, []);

  if (!rain.length) return null;
  return (
    <div className={styles.rain} aria-hidden="true">
      {rain.map((d) => (
        <span
          key={d.id}
          style={
            {
              left: `${d.left}%`,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.dur}s`,
              "--spin": `${d.spin}deg`,
            } as React.CSSProperties
          }
        >
          <PixelSushi size={Math.round(d.size)} />
        </span>
      ))}
    </div>
  );
}

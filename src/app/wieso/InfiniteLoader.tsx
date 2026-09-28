"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { t } from "@/content/texts";
import PixelIcon from "@/components/PixelIcon";
import styles from "./wieso.module.css";

const w = t.wieso;
const MESSAGES = w.ladeMeldungen.length ? w.ladeMeldungen : ["…"];

function percent(seconds: number) {
  return 100 * (1 - 1 / (1 + seconds / 3));
}

function format(p: number) {
  if (p < 99) return p.toFixed(0);
  const decimals = Math.min(8, Math.max(1, Math.floor(-Math.log10(100 - p)) + 1));
  return p.toFixed(decimals).replace(".", ",");
}

export default function InfiniteLoader() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => setSeconds((performance.now() - start) / 1000), 150);
    return () => window.clearInterval(id);
  }, []);

  const p = percent(seconds);
  const msg = MESSAGES[Math.floor(seconds / 2.4) % MESSAGES.length];

  return (
    <div className={styles.center}>
      <section className={`win-panel ${styles.dialog}`} aria-labelledby="wieso-title">
        <div className="win-titlebar">
          <h1 id="wieso-title" style={{ font: "inherit" }}>{w.kopfzeile}</h1>
          <Link href="/" className={styles.x} aria-label={w.aufgeben}>
            ✕
          </Link>
        </div>
        <div className={styles.body}>
          <div className={styles.anim} aria-hidden="true">
            <PixelIcon name="folder" size={40} />
            <span className={styles.paper}>
              <PixelIcon name="paper" size={20} />
            </span>
            <PixelIcon name="folderOpen" size={40} />
          </div>
          <p className={styles.lines}>{w.ueberschrift.join(" ")}</p>
          <p className={styles.msg} aria-hidden="true">
            {msg}
          </p>
          <div
            className={styles.bar}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(p)}
            aria-valuetext={`${Math.floor(p)} Prozent`}
          >
            <span style={{ width: `${p}%` }} />
          </div>
          <p className={styles.pct}>{format(p)} %</p>
          <p className={styles.tip}>
            {w.tipp} <Link href="/promises">{w.tippLink}</Link>
          </p>
          <div className={styles.buttons}>
            <Link href="/" className="btn">
              {w.abbrechenKnopf}
            </Link>
          </div>
          <p className={styles.giveUp}>
            <Link href="/">{w.aufgeben}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
